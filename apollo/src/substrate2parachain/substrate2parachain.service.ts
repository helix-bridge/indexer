import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { RecordsService } from '../model/RecordsService';
import { TasksService } from '../tasks/tasks.service';

// pangolin -> pangolin parachain
// crab -> crab parachain
// darwinia -> darwinia parachain
@Injectable()
export class Substrate2parachainService extends RecordsService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_TO_PARACHAIN_BACKING');
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_TO_PARACHAIN_ISSUING');

  private readonly fetchHistoryDataInterval = 10000;

  private readonly fetchHistoryDataFirst = 10;

  private needSyncLockConfirmed = true;
  private needSyncLock = true;

  private needSyncBurnConfirmed = true;
  private needSyncBurn = true;

  private isSyncingHistory = false;

  private readonly chain = this.configService.get<string>('PARACHAIN');
  private readonly lockFeeToken = this.configService.get<string>('PARACHAIN_LOCK_FEE_TOKEN');
  private readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(
    private configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService
  ) {
    super();
  }

  async onModuleInit() {
    this.taskService.addInterval(
      `${this.chain}-parachain-fetch_history_data`,
      this.fetchHistoryDataInterval,
      async () => {
        if (this.isSyncingHistory) {
          return;
        }

        this.isSyncingHistory = true;
        await this.fetchLockRecords();
        await this.fetchBurnRecords();
        await this.checkLockRecords();
        await this.checkBurnRecords();
        await this.checkConfirmedLockRecords();
        await this.checkConfirmedBurnRecords();
        this.isSyncingHistory = false;
      }
    );
  }

  private fetchInfos(isLock: boolean) {
    return isLock
      ? [this.chain, this.chain + '-parachain', this.backingUrl, `${this.chain}-parachain-lock`]
      : ([
          this.chain + '-parachain',
          this.chain,
          this.issuingUrl,
          `${this.chain}-parachain-burn`,
        ] as const);
  }

  private async fetchS2sRecords(isLock: boolean) {
    const [fromChain, toChain, url, keyPrefix] = this.fetchInfos(isLock);

    try {
      const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
        fromChain,
        toChain,
        bridge: 'helix',
      });

      const latestNonce = firstRecord ? firstRecord.nonce : -1;

      const res = await axios.post(url, {
        query: `query { s2sEvents (first: ${this.fetchHistoryDataFirst}, orderBy: NONCE_ASC, filter: {nonce: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, senderId, recipient, fee}}}`,
        variables: null,
      });

      const nodes = res.data?.data?.s2sEvents?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;
      const token = this.isTest ? 'PRING' : 'CRAB';

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: `${keyPrefix}-${node.id}`,
            fromChain,
            toChain,
            bridge: 'helix',
            laneId: node.laneId,
            nonce: global.BigInt(node.nonce),
            requestTxHash: node.requestTxHash,
            responseTxHash: node.responseTxHash,
            sender: node.senderId,
            recipient: node.recipient,
            token,
            amount: node.amount,
            startTime: getUnixTime(new Date(node.startTimestamp)) - timezone,
            endTime: getUnixTime(new Date(node.endTimestamp)) - timezone,
            result: node.result,
            fee: node.fee,
            feeToken: this.lockFeeToken,
            targetTxHash: '',
            bridgeDispatchMethod: '',
          });

          if (node.result === 0) {
            if (!this.needSyncLockConfirmed && isLock) {
              this.needSyncLockConfirmed = true;
            } else if (!this.needSyncBurnConfirmed && !isLock) {
              this.needSyncBurnConfirmed = true;
            }
          }
        }

        this.logger.log(
          `save new ${fromChain} to ${toChain} records success, latestNonce: ${latestNonce}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(`fetch ${fromChain} to ${toChain} records failed ${e}`);
    }
  }

  private async checkConfirmedRecords(isLock: boolean) {
    if (!this.needSyncLockConfirmed && isLock) {
      return;
    } else if (!this.needSyncBurnConfirmed && !isLock) {
      return;
    }

    const [fromChain, toChain, url, keyPrefix] = this.fetchInfos(isLock);

    try {
      const { records: unconfirmedRecords } = await this.aggregationService.queryHistoryRecords({
        take: this.fetchHistoryDataFirst,
        where: {
          fromChain,
          toChain,
          bridge: 'helix',
          result: 0,
        },
      });

      if (unconfirmedRecords.length == 0) {
        if (isLock) {
          this.needSyncLockConfirmed = false;
        } else {
          this.needSyncBurnConfirmed = false;
        }
        return;
      }

      const targetNonces = [];

      for (const record of unconfirmedRecords) {
        targetNonces.push('"' + record.nonce + '"');
      }

      const nonces = targetNonces.join(',');

      const res = await axios.post(url, {
        query: `query { s2sEvents (filter: {nonce: {in: [${nonces}]}}) { nodes {id, endTimestamp, responseTxHash, result }}}`,
        variables: null,
      });

      const nodes = res.data?.data?.s2sEvents?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;

      if (nodes && nodes.length > 0) {
        let updated = 0;

        for (const node of nodes) {
          if (node.result === 0) {
            continue;
          }
          updated += 1;

          await this.aggregationService.updateHistoryRecord({
            where: {
              id: `${keyPrefix}-${node.id}`,
            },
            data: {
              responseTxHash: node.responseTxHash,
              endTime: getUnixTime(new Date(node.endTimestamp)) - timezone,
              result: node.result,
            },
          });
        }
        if (updated > 0) {
          this.logger.log(
            `update ${fromChain} to ${toChain} records success, nonces: ${nonces}, ${updated}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(`update ${fromChain} to ${toChain} records failed ${e}`);
    }
  }

  private async checkRecords(isLock: boolean) {
    if (!this.needSyncLock && isLock) {
      return;
    } else if (!this.needSyncBurn && !isLock) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [fromChain, toChain, _url, keyPrefix] = this.fetchInfos(isLock);

    try {
      const { records: uncheckedRecords } = await this.aggregationService.queryHistoryRecords({
        take: this.fetchHistoryDataFirst,
        where: {
          fromChain,
          toChain,
          bridge: 'helix',
          targetTxHash: '',
        },
      });

      if (uncheckedRecords.length === 0) {
        if (isLock) {
          this.needSyncLock = false;
        } else {
          this.needSyncBurn = false;
        }

        return;
      }

      const ids = uncheckedRecords.map((item) => `"${last(item.id.split('-'))}"`).join(',');

      const res = await axios.post(isLock ? this.issuingUrl : this.backingUrl, {
        query: `query { bridgeDispatchEvents (filter: {id: {in: [${ids}]}}) { nodes {id, method, block }}}`,
        variables: null,
      });

      const nodes = res.data?.data?.bridgeDispatchEvents?.nodes;

      if (nodes && nodes.length > 0) {
        let updated = 0;

        for (const node of nodes) {
          updated += 1;

          await this.aggregationService.updateHistoryRecord({
            where: {
              id: `${keyPrefix}-${node.id}`,
            },
            data: {
              targetTxHash: node.block.extrinsicHash,
              bridgeDispatchMethod: node.method,
            },
          });
        }

        if (updated > 0) {
          this.logger.log(
            `update ${
              nodes.length
            } ${fromChain} to ${toChain} dispatch records success, ids: ${nodes.map(
              (item) => item.id
            )}, ${updated}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(`update ${fromChain} to ${toChain} dispatch records failed ${e}`);
    }
  }

  async fetchLockRecords() {
    await this.fetchS2sRecords(true);
  }

  async fetchBurnRecords() {
    await this.fetchS2sRecords(false);
  }

  async checkLockRecords() {
    await this.checkRecords(true);
  }

  async checkBurnRecords(): Promise<void> {
    await this.checkRecords(false);
  }

  async checkConfirmedLockRecords() {
    await this.checkConfirmedRecords(true);
  }

  async checkConfirmedBurnRecords() {
    await this.checkConfirmedRecords(false);
  }
}
