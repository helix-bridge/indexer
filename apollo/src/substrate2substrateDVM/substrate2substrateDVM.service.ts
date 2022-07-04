import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { RecordsService } from '../base/RecordsService';
import { Transfer, TransferAction } from '../base/TransferService';
import { TasksService } from '../tasks/tasks.service';
import { Substrate2SubstrateDVMRecord, SubstrateDVM2SubstrateRecord } from './modal';
import { TransferService } from './transfer.service';

@Injectable()
export class Substrate2substrateDVMService extends RecordsService implements OnModuleInit {
  private readonly subql = this.configService.get<string>('SUBQL');

  private readonly transfersCount = this.transferService.transfers.length;

  protected readonly needSyncLock = new Array(this.transfersCount).fill(true);

  protected readonly needSyncLockConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurn = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurnConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly isSyncingHistory = new Array(this.transfersCount).fill(false);

  private readonly isSyncingStatistics = new Array(this.transfersCount).fill(false);

  constructor(
    public configService: ConfigService,
    public logger: Logger,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
    super();
  }

  protected genID(transfer: Transfer, action: TransferAction, id: string) {
    return `${transfer.from.chain}2${transfer.to.chain}-${action}-${id}`;
  }

  private lockRecordToHistory(record: Substrate2SubstrateDVMRecord, transfer: Transfer) {
    return {
      ...record,
      id: this.genID(transfer, 'lock', record.id),
      fromChain: transfer.from.chain,
      toChain: transfer.to.chain,
      bridge: 'helix',
      nonce: global.BigInt(record.nonce),
      sender: record.senderId,
      token: transfer.from.token,
      startTime: this.toUnixTime(record.startTimestamp),
      endTime: this.toUnixTime(record.endTimestamp),
      feeToken: transfer.to.token,
      targetTxHash: '',
      bridgeDispatchMethod: '',
    };
  }

  private burnRecordToHistory(record: SubstrateDVM2SubstrateRecord, transfer: Transfer) {
    return {
      ...record,
      id: this.genID(transfer, 'burn', record.id),
      fromChain: transfer.to.chain,
      toChain: transfer.from.chain,
      bridge: 'helix',
      laneId: record.lane_id,
      nonce: global.BigInt(record.nonce),
      requestTxHash: record.request_transaction,
      responseTxHash: record.response_transaction,
      token: transfer.to.token,
      startTime: Number(record.start_timestamp),
      endTime: Number(record.end_timestamp),
      fee: record.fee.toString(),
      feeToken: transfer.to.feeToken,
      targetTxHash: '',
      bridgeDispatchMethod: '',
    };
  }

  async onModuleInit() {
    this.taskService.addInterval(
      `substrate-substrateDVM-fetch_history_data`,
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
          await this.checkRecords(item, 'lock', index);
          await this.checkConfirmedRecords(item, 'lock', index);
          await this.fetchRecords(item, 'burn', index);
          await this.checkRecords(item, 'burn', index);
          await this.checkConfirmedRecords(item, 'burn', index);
          this.isSyncingHistory[index] = false;
        }
      }
    );

    this.taskService.addInterval(
      `substrate-substrateDVM-fetch_statistics_data`,
      3600000,
      async () => {
        const transfers = this.transferService.transfers;
        const len = transfers.length;

        for (let index = 0; index < len; index) {
          if (this.isSyncingStatistics[index]) {
            continue;
          }

          const item = transfers[index];

          this.isSyncingStatistics[index] = true;
          await this.fetchDailyStatistics(item, 'lock');
          await this.fetchDailyStatistics(item, 'burn');
          this.isSyncingStatistics[index] = false;
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
        .then((record) => (record ? record.nonce : -1));

      const records = await axios
        .post(from.url, {
          query: this.transferService.getRecordQueryString(
            action,
            this.fetchHistoryDataFirst,
            latestNonce
          ),
          variables: null,
        })
        .then((res) =>
          action === 'lock'
            ? (res.data?.data?.s2sEvents?.nodes as Substrate2SubstrateDVMRecord[]).map((record) =>
                this.lockRecordToHistory(record, transfer)
              )
            : (res.data?.data?.burnRecordEntities as SubstrateDVM2SubstrateRecord[]).map((record) =>
                this.burnRecordToHistory(record, transfer)
              )
        );

      if (records && records.length > 0) {
        for (const record of records) {
          await this.aggregationService.createHistoryRecord(record);

          if (!this.needSyncLockConfirmed && record.result === 0) {
            this.needSyncLockConfirmed[index] = true;
          }
        }

        this.logger.log(
          `save new ${from.chain} to ${to.chain} ${action} records success, latestNonce: ${latestNonce}, added: ${records.length}`
        );
      }
    } catch (e) {
      this.logger.warn(`fetch ${from.chain} to ${to.chain} ${action} records failed ${e}`);
    }
  }

  async checkRecords(transfer: Transfer, action: TransferAction, index: number) {
    if (
      (action === 'lock' && !this.needSyncLock[index]) ||
      (action === 'burn' && !this.needSyncBurn[index])
    ) {
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

      if (uncheckedRecords.length <= 1) {
        if (action === 'lock') {
          this.needSyncLock[index] = false;
        } else {
          this.needSyncBurn[index] = false;
        }

        return;
      }

      const ids = uncheckedRecords.map((item) => `"${last(item.id.split('-'))}"`).join(',');

      const nodes = await axios
        .post(this.subql + to.chain.split('-')[0], {
          query: `query { bridgeDispatchEvents (filter: {id: {in: [${ids}]}}) { nodes {id, method, block }}}`,
          variables: null,
        })
        .then((res) =>
          action === 'lock'
            ? res.data?.data?.bridgeDispatchEvent?.nodes
            : res.data?.data?.burnRecordEntities
        );

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
            `update ${from.chain} to ${to.chain} dispatch records success, ids: ${nodes.map(
              (item) => item.id
            )}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(`update ${from.chain} to ${to.chain} dispatch records failed ${e}`);
    }
  }

  async checkConfirmedRecords(transfer: Transfer, action: TransferAction, index: number) {
    if (
      (action === 'lock' && !this.needSyncLockConfirmed) ||
      (action === 'burn' && !this.needSyncBurnConfirmed)
    ) {
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

      if (action === 'lock' && unconfirmedRecords.length === 0) {
        this.needSyncLockConfirmed[index] = false;
        return;
      } else if (action === 'burn' && unconfirmedRecords.length <= 1) {
        this.needSyncBurnConfirmed[index] = false;
        return;
      } else {
        // nothing to do
      }

      const nonces = unconfirmedRecords.map(
        (record) => (action === 'lock' ? `"${record.nonce}"` : record.nonce.toString()) as string
      );

      const records = await axios
        .post(from.url, {
          query: this.transferService.getConfirmRecordQueryString(action, nonces),
          variables: null,
        })
        .then((res) =>
          action === 'lock'
            ? (res.data?.data?.s2sEvents?.nodes as Substrate2SubstrateDVMRecord[]).map(
                (record) => ({
                  id: this.genID(transfer, action, record.id),
                  responseTxHash: record.responseTxHash,
                  endTime: this.toUnixTime(record.endTimestamp),
                  result: record.result,
                })
              )
            : (res.data?.data?.burnRecordEntities as SubstrateDVM2SubstrateRecord[]).map(
                (record) => ({
                  id: this.genID(transfer, action, record.id),
                  responseTxHash: record.response_transaction,
                  endTime: Number(record.end_timestamp),
                  result: record.result,
                })
              )
        );

      if (records && records.length > 0) {
        let newRecordUpdated = false;

        for (const record of records) {
          if (record.result === 0) {
            continue;
          }

          newRecordUpdated = true;
          const { id, ...data } = record;

          await this.aggregationService.updateHistoryRecord({
            where: { id },
            data,
          });
        }

        if (newRecordUpdated) {
          this.logger.log(
            `update ${from.chain} to ${to.chain} ${action} records success, nonces: ${nonces}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(`update ${from.chain} to ${to.chain} ${action} records failed ${e}`);
    }
  }

  async fetchDailyStatistics(transfer: Transfer, action: TransferAction) {
    let { from, to } = transfer;

    if (action === 'burn') {
      [to, from] = [from, to];
    }

    try {
      const latestDay = await this.aggregationService
        .queryDailyStatisticsFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: 'helix',
        })
        .then((firstRecord) => (firstRecord ? firstRecord.timestamp : -1));

      const nodes = await axios
        .post(from.url, {
          query: this.transferService.getDailyStatisticsQueryString(action, latestDay),
          variables: null,
        })
        .then((res) =>
          action === 'lock'
            ? res.data?.data?.s2sDailyStatistics?.nodes
            : res.data?.data?.burnDailyStatistics
        );

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createDailyStatistics({
            fromChain: from.chain,
            toChain: to.chain,
            bridge: 'helix',
            timestamp: Number(node.id),
            token: 'native-ring',
            dailyVolume: global.BigInt(node.dailyVolume),
            dailyCount: node.dailyCount,
          });
        }

        this.logger.log(
          `save new ${from.chain} to ${to.chain} daily statistics from issuing success, latestDay: ${latestDay}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `fetch ${from.chain} to ${to.chain} daily statistics from issuing records failed ${e}`
      );
    }
  }
}
