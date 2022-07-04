import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { RecordsService } from '../base/RecordsService';
import { Transfer, TransferAction } from '../base/TransferService';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

// pangolin -> pangolin parachain
// crab -> crab parachain
// darwinia -> darwinia parachain
@Injectable()
export class Substrate2parachainService extends RecordsService implements OnModuleInit {
  private readonly transfersCount = this.transferService.transfers.length;

  protected readonly needSyncLockConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly needSyncLock = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurnConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurn = new Array(this.transfersCount).fill(true);

  protected readonly isSyncingHistory = new Array(this.transfersCount).fill(false);

  private readonly lockFeeToken = this.configService.get<string>('PARACHAIN_LOCK_FEE_TOKEN');

  constructor(
    public configService: ConfigService,
    public logger: Logger,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
    super();
  }

  protected genID(transfer: Transfer, action: TransferAction, identifier: string): string {
    return `${transfer.from.chain.split('-')[0]}-parachain-${action}-${identifier}`;
  }

  async onModuleInit() {
    this.taskService.addInterval(
      `substrate-parachain-fetch_history_data`,
      this.fetchHistoryDataInterval,
      async () => {
        const transfers = this.transferService.transfers;
        const len = transfers.length;

        for (let index = 0; index < len; index) {
          if (this.isSyncingHistory[index]) {
            continue;
          }

          const item = transfers[index];

          this.isSyncingHistory[index] = true;
          await this.fetchRecords(item, 'lock', index);
          await this.fetchRecords(item, 'burn', index);
          await this.checkRecords(item, 'lock', index);
          await this.checkRecords(item, 'burn', index);
          await this.checkConfirmedRecords(item, 'lock', index);
          await this.checkConfirmedRecords(item, 'burn', index);
          this.isSyncingHistory[index] = false;
        }
      }
    );
  }

  async fetchRecords(transfer: Transfer, action: TransferAction, index: number) {
    let { from, to } = transfer;

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
            bridgeDispatchMethod: '',
          });

          if (node.result === 0) {
            if (!this.needSyncLockConfirmed[index] && isLock) {
              this.needSyncLockConfirmed[index] = true;
            } else if (!this.needSyncBurnConfirmed && !isLock) {
              this.needSyncBurnConfirmed[index] = true;
            }
          }
        }

        this.logger.log(
          `save new ${from.chain} to ${to.chain} records success, latestNonce: ${latestNonce}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(`fetch ${from.chain} to ${to.chain} records failed ${e}`);
    }
  }

  async checkConfirmedRecords(transfer: Transfer, action: TransferAction, index: number) {
    if (!this.needSyncLockConfirmed[index] && action === 'lock') {
      return;
    } else if (!this.needSyncBurnConfirmed[index] && action === 'burn') {
      return;
    }

    let { from, to } = transfer;

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
        .post(from.url, {
          query: `query { s2sEvents (filter: {nonce: {in: [${nonces}]}}) { nodes {id, endTimestamp, responseTxHash, result }}}`,
          variables: null,
        })
        .then((res) => res.data?.data?.s2sEvents?.nodes);

      if (nodes && nodes.length > 0) {
        let updated = 0;

        for (const node of nodes) {
          if (node.result === 0) {
            continue;
          }
          updated += 1;

          await this.aggregationService.updateHistoryRecord({
            where: { id: this.genID(transfer, action, node.id) },
            data: {
              responseTxHash: node.responseTxHash,
              endTime: this.toUnixTime(node.endTimestamp),
              result: node.result,
            },
          });
        }
        if (updated > 0) {
          this.logger.log(
            `update ${from.chain} to ${to.chain} records success, nonces: ${nonces}, ${updated}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(`update ${from.chain} to ${to.chain} records failed ${e}`);
    }
  }

  async checkRecords(transfer: Transfer, action: TransferAction, index: number) {
    if (!this.needSyncLock[index] && action === 'lock') {
      return;
    } else if (!this.needSyncBurn[index] && action === 'burn') {
      return;
    }

    let { from, to } = transfer;

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

      const ids = uncheckedRecords.map((item) => `"${last(item.id.split('-'))}"`).join(',');

      const nodes = await axios
        .post(from.url, {
          query: `query { bridgeDispatchEvents (filter: {id: {in: [${ids}]}}) { nodes {id, method, block }}}`,
          variables: null,
        })
        .then((res) => res.data?.data?.bridgeDispatchEvents?.nodes);

      if (nodes && nodes.length > 0) {
        let updated = 0;

        for (const node of nodes) {
          updated += 1;

          await this.aggregationService.updateHistoryRecord({
            where: { id: this.genID(transfer, action, node.id) },
            data: {
              targetTxHash: node.block.extrinsicHash,
              bridgeDispatchMethod: node.method,
            },
          });
        }

        if (updated > 0) {
          this.logger.log(
            `update ${nodes.length} ${from.chain} to ${
              to.chain
            } dispatch records success, ids: ${nodes.map((item) => item.id)}, ${updated}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(`update ${from.chain} to ${to.chain} dispatch records failed ${e}`);
    }
  }
}
