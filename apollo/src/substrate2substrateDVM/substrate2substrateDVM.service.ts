import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { RecordsService } from '../base/RecordsService';
import { Transfer, TransferAction } from '../base/TransferService';
import { SubqlRecord, ThegraphRecord } from '../interface/record';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

@Injectable()
export class Substrate2substrateDVMService extends RecordsService implements OnModuleInit {
  private readonly logger = new Logger('Substrate<>SubstrateDVM');

  private readonly subql = this.configService.get<string>('SUBQL');

  private readonly transfersCount = this.transferService.transfers.length;

  protected readonly needSyncLock = new Array(this.transfersCount).fill(true);

  protected readonly needSyncLockConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurn = new Array(this.transfersCount).fill(true);

  protected readonly needSyncBurnConfirmed = new Array(this.transfersCount).fill(true);

  protected readonly isSyncingHistory = new Array(this.transfersCount).fill(false);

  private readonly isSyncingStatistics = new Array(this.transfersCount).fill(false);

  // Transactions that will never be done
  private requestTxHashOmitList = [
    '0x7d682087bf51311c93896a34e570af3b78eb57f951689f7b6a5965b83024c0f9',
  ];

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
    super();
  }

  protected genID(transfer: Transfer, action: TransferAction, id: string) {
    return `${transfer.backing.chain}2${transfer.issuing.chain}-${action}-${id}`;
  }

  private lockRecordToHistory(record: SubqlRecord, transfer: Transfer) {
    return {
      amount: record.amount,
      bridge: 'helix',
      bridgeDispatchError: '',
      endTime: this.toUnixTime(record.endTimestamp),
      fee: record.fee,
      feeToken: transfer.issuing.token,
      fromChain: transfer.backing.chain,
      id: this.genID(transfer, 'lock', record.id),
      laneId: record.laneId,
      nonce: global.BigInt(record.nonce),
      recipient: record.recipient,
      requestTxHash: record.requestTxHash,
      responseTxHash: record.responseTxHash,
      result: record.result,
      sender: record.senderId,
      startTime: this.toUnixTime(record.startTimestamp),
      targetTxHash: '',
      toChain: transfer.issuing.chain,
      token: transfer.backing.token,
    };
  }

  private burnRecordToHistory(record: ThegraphRecord, transfer: Transfer) {
    return {
      amount: record.amount,
      bridge: 'helix',
      bridgeDispatchError: '',
      endTime: Number(record.end_timestamp),
      fee: record.fee.toString(),
      feeToken: transfer.issuing.feeToken,
      fromChain: transfer.issuing.chain,
      id: this.genID(transfer, 'burn', record.id),
      laneId: record.lane_id,
      nonce: global.BigInt(record.nonce),
      recipient: record.recipient,
      requestTxHash: record.request_transaction,
      responseTxHash: record.response_transaction,
      result: record.result,
      sender: record.sender,
      startTime: Number(record.start_timestamp),
      targetTxHash: '',
      toChain: transfer.backing.chain,
      token: transfer.issuing.token,
    };
  }

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      const prefix = `${item.backing.chain}-${item.issuing.chain}`;
      this.taskService.addInterval(
        `${prefix}-fetch_history_data`,
        this.fetchHistoryDataInterval,
        async () => {
          if (this.isSyncingHistory[index]) {
            return;
          }
          this.isSyncingHistory[index] = true;
          await this.fetchRecords(item, 'lock', index);
          await this.checkDispatched(item, 'lock', index);
          await this.checkConfirmed(item, 'lock', index);
          await this.fetchRecords(item, 'burn', index);
          await this.checkDispatched(item, 'burn', index);
          await this.checkConfirmed(item, 'burn', index);
          this.isSyncingHistory[index] = false;
        }
      );
      this.taskService.addInterval(`${prefix}-fetch_statistics_data`, 60 * 60 * 1000, async () => {
        if (this.isSyncingStatistics[index]) {
          return;
        }
        this.isSyncingStatistics[index] = true;
        await this.fetchDailyStatistics(item, 'lock');
        await this.fetchDailyStatistics(item, 'burn');
        this.isSyncingStatistics[index] = false;
      });
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
            ? (res.data?.data?.s2sEvents?.nodes as SubqlRecord[]).map((record) =>
                this.lockRecordToHistory(record, transfer)
              )
            : (res.data?.data?.burnRecordEntities as ThegraphRecord[]).map((record) =>
                this.burnRecordToHistory(record, transfer)
              )
        );

      if (records && records.length > 0) {
        for (const record of records) {
          await this.aggregationService.createHistoryRecord(record);
        }

        if (records.some((record) => record.result === 0)) {
          if (action === 'lock' && !this.needSyncLockConfirmed[index]) {
            this.needSyncLockConfirmed[index] = true;
            this.needSyncLock[index] = true;
          }

          if (action === 'burn' && !this.needSyncBurnConfirmed[index]) {
            this.needSyncBurnConfirmed[index] = true;
            this.needSyncBurn[index] = true;
          }
        }

        this.logger.log(
          this.fetchRecordsLog(action, from.chain, to.chain, { latestNonce, added: records.length })
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
        .post<{ data: { bridgeDispatchEvents: { nodes: any[] } } }>(
          this.subql + to.chain.split('-')[0],
          {
            query: `query { bridgeDispatchEvents (filter: {id: {in: [${ids}]}}) { nodes {id, method, block }}}`,
            variables: null,
          }
        )
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
            ids: nodes.map((item) => item.id).join(','),
            updated: nodes.length,
          })
        );
      }
    } catch (error) {
      this.logger.warn(this.checkRecordsLog(action, from.chain, to.chain, { error }));
    }
  }

  async checkConfirmed(transfer: Transfer, action: TransferAction, index: number) {
    if (
      (action === 'lock' && !this.needSyncLockConfirmed) ||
      (action === 'burn' && !this.needSyncBurnConfirmed)
    ) {
      return;
    }

    let { backing: from, issuing: to } = transfer;

    if (action === 'burn') {
      [to, from] = [from, to];
    }

    try {
      const { records: unconfirmedRecords } = await this.aggregationService
        .queryHistoryRecords({
          take: this.fetchHistoryDataFirst,
          where: {
            fromChain: from.chain,
            toChain: to.chain,
            bridge: 'helix',
            result: 0,
          },
        })
        .then((result) => ({
          ...result,
          records: result.records.filter(
            (item) => !this.requestTxHashOmitList.includes(item.requestTxHash)
          ),
        }));

      if (action === 'lock' && unconfirmedRecords.length === 0) {
        this.needSyncLockConfirmed[index] = false;
        return;
      } else if (action === 'burn' && unconfirmedRecords.length === 0) {
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
            ? (res.data?.data?.s2sEvents?.nodes as SubqlRecord[]).map((record) => ({
                id: this.genID(transfer, action, record.id),
                responseTxHash: record.responseTxHash,
                endTime: this.toUnixTime(record.endTimestamp),
                result: record.result,
              }))
            : (res.data?.data?.burnRecordEntities as ThegraphRecord[]).map((record) => ({
                id: this.genID(transfer, action, record.id),
                responseTxHash: record.response_transaction,
                endTime: Number(record.end_timestamp),
                result: record.result,
              }))
        )
        .then((records) => records.filter((record) => record.result !== 0));

      if (records && records.length > 0) {
        for (const record of records) {
          const { id, ...data } = record;

          await this.aggregationService.updateHistoryRecord({
            where: { id },
            data,
          });
        }

        this.logger.log(
          this.checkConfirmRecordsLog(action, from.chain, to.chain, { nonces: nonces.join(',') })
        );
      }
    } catch (error) {
      this.logger.warn(this.checkConfirmRecordsLog(action, from.chain, to.chain, { error }));
    }
  }

  async fetchDailyStatistics(transfer: Transfer, action: TransferAction) {
    let { backing: from, issuing: to } = transfer;

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
          `[Statistics] Save new ${from.chain} to ${to.chain} daily statistics from issuing success, latestDay: ${latestDay}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `[Statistics] Fetch ${from.chain} to ${to.chain} daily statistics from issuing records failed ${e}`
      );
    }
  }
}
