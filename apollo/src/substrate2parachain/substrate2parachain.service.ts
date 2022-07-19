import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';
import { RecordsService } from '../base/RecordsService';
import { Transfer, TransferAction } from '../base/TransferService';
import { SubqlRecord } from '../interface/record';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

// pangolin -> pangolin parachain
// crab -> crab parachain
// darwinia -> darwinia parachain
@Injectable()
export class Substrate2parachainService extends RecordsService implements OnModuleInit {
  private readonly logger = new Logger('Substrate<>Parachain');

  private readonly transfersCount = this.transferService.transfers.length;

  protected readonly needSyncLockConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly needSyncLock = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurnConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurn = new Array(this.transfersCount).fill(true);

  protected readonly isSyncingHistory = new Array(this.transfersCount).fill(false);

  private readonly lockFeeToken = this.configService.get<string>('PARACHAIN_LOCK_FEE_TOKEN');

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
    super();
  }

  protected genID(transfer: Transfer, action: TransferAction, identifier: string): string {
    return `${transfer.backing.chain.split('-')[0]}-parachain-${action}-${identifier}`;
  }

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.taskService.addInterval(
        `${item.backing.chain}-parachain-fetch_history_data`,
        this.fetchHistoryDataInterval,
        async () => {
          if (this.isSyncingHistory[index]) {
            return;
          }
          this.isSyncingHistory[index] = true;
          await this.fetchRecords(item, 'lock', index);
          await this.fetchRecords(item, 'burn', index);
          await this.checkDispatched(item, 'lock', index);
          await this.checkDispatched(item, 'burn', index);
          await this.checkConfirmed(item, 'lock', index);
          await this.checkConfirmed(item, 'burn', index);
          this.isSyncingHistory[index] = false;
        }
      );
    });
  }

  async fetchRecords(transfer: Transfer, action: TransferAction, index: number) {
    let { backing: from, issuing: to } = transfer;

    if (action === 'burn') {
      [to, from] = [from, to];
    }

    try {
      const latestNonce = await this.aggregationService
        .queryHistoryRecordFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: 'helix',
        })
        .then((firstRecord) => (firstRecord ? firstRecord.nonce : -1));

      const nodes = await axios
        .post(from.url, {
          query: `query { s2sEvents (first: ${this.fetchHistoryDataFirst}, orderBy: NONCE_ASC, filter: {nonce: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, senderId, recipient, fee}}}`,
          variables: null,
        })
        .then((res) => res.data?.data?.s2sEvents?.nodes);

      const isLock = action === 'lock';

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, action, node.id),
            fromChain: from.chain,
            toChain: to.chain,
            bridge: 'helix',
            laneId: node.laneId,
            nonce: global.BigInt(node.nonce),
            requestTxHash: node.requestTxHash,
            responseTxHash: node.responseTxHash,
            sender: node.senderId,
            recipient: node.recipient,
            token: from.token,
            amount: node.amount,
            startTime: this.toUnixTime(node.startTimestamp),
            endTime: this.toUnixTime(node.endTimestamp),
            result: node.result,
            fee: node.fee,
            feeToken: this.lockFeeToken,
            targetTxHash: '',
            bridgeDispatchError: '',
          });

          if (!this.needSyncLock[index] && isLock) {
            this.needSyncLock[index] = true;
          } else if (!this.needSyncBurn[index] && !isLock) {
            this.needSyncBurn[index] = true;
          }

          if (node.result === 0) {
            if (!this.needSyncLockConfirmed[index] && isLock) {
              this.needSyncLockConfirmed[index] = true;
            } else if (!this.needSyncBurnConfirmed && !isLock) {
              this.needSyncBurnConfirmed[index] = true;
            }
          }
        }

        this.logger.log(
          this.fetchRecordsLog(action, from.chain, to.chain, { latestNonce, added: nodes.length })
        );
      }
    } catch (error) {
      this.logger.warn(this.fetchRecordsLog(action, from.chain, to.chain, { error }));
    }
  }

  async checkDispatched(transfer: Transfer, action: TransferAction, index: number) {
    if (
      (action === 'lock' && !this.needSyncLock[index]) ||
      (action === 'burn' && !this.needSyncBurn[index])
    ) {
      return;
    }

    let { backing: from, issuing: to } = transfer;

    if (action === 'burn') {
      [to, from] = [from, to];
    }

    try {
      const { records: uncheckedRecords } = await this.aggregationService.queryHistoryRecords({
        take: this.fetchHistoryDataFirst,
        where: {
          fromChain: from.chain,
          toChain: to.chain,
          bridge: 'helix',
          targetTxHash: '',
        },
      });

      if (uncheckedRecords.length === 0) {
        if (action === 'lock') {
          this.needSyncLock[index] = false;
        } else {
          this.needSyncBurn[index] = false;
        }

        return;
      }

      const ids = uncheckedRecords.map((item) => `"${item.id.split('-')[3]}"`).join(',');

      const nodes = await axios
        .post(to.url, {
          query: `query { bridgeDispatchEvents (filter: {id: {in: [${ids}]}}) { nodes {id, method, block }}}`,
          variables: null,
        })
        .then((res) => res.data?.data?.bridgeDispatchEvents?.nodes);

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.updateHistoryRecord({
            where: { id: this.genID(transfer, action, node.id) },
            data: {
              targetTxHash: node.block.extrinsicHash,
              bridgeDispatchError: node.method,
            },
          });
        }

        this.logger.log(
          this.checkRecordsLog(action, from.chain, to.chain, {
            ids: nodes.map((item) => item.id),
            updated: nodes.length,
          })
        );
      }
    } catch (error) {
      this.logger.warn(this.checkRecordsLog(action, from.chain, to.chain, { error }));
    }
  }

  async checkConfirmed(transfer: Transfer, action: TransferAction, index: number) {
    if (!this.needSyncLockConfirmed[index] && action === 'lock') {
      return;
    } else if (!this.needSyncBurnConfirmed[index] && action === 'burn') {
      return;
    }

    let { backing: from, issuing: to } = transfer;

    if (action === 'burn') {
      [to, from] = [from, to];
    }

    try {
      const { records: unconfirmedRecords } = await this.aggregationService.queryHistoryRecords({
        take: this.fetchHistoryDataFirst,
        where: {
          fromChain: from.chain,
          toChain: to.chain,
          bridge: 'helix',
          result: 0,
        },
      });

      if (unconfirmedRecords.length == 0) {
        if (action === 'lock') {
          this.needSyncLockConfirmed[index] = false;
        } else {
          this.needSyncBurnConfirmed[index] = false;
        }

        return;
      }

      const nonces = unconfirmedRecords.map((record) => `"${record.nonce}"`).join(',');

      const nodes = await axios
        .post<{ data: { s2sEvents: { nodes: SubqlRecord[] } } }>(from.url, {
          query: `query { s2sEvents (filter: {nonce: {in: [${nonces}]}}) { nodes {id, endTimestamp, responseTxHash, result }}}`,
          variables: null,
        })
        .then((res) => res.data?.data?.s2sEvents?.nodes.filter((item) => item.result > 0));

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.updateHistoryRecord({
            where: { id: this.genID(transfer, action, node.id) },
            data: {
              responseTxHash: node.responseTxHash,
              endTime: this.toUnixTime(node.endTimestamp),
              result: node.result,
            },
          });
        }

        this.logger.log(
          this.checkConfirmRecordsLog(action, from.chain, to.chain, {
            nonces,
            updated: nodes.length,
          })
        );
      }
    } catch (error) {
      this.logger.warn(this.checkConfirmRecordsLog(action, from.chain, to.chain, { error }));
    }
  }
}
