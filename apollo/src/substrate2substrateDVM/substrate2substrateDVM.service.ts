import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class Substrate2substrateDVMService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  // lock and mint
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_ISSUING');

  private readonly fetchHistoryDataInterval = 10000;

  private readonly fetchDailyStatisticsInterval = 3600000;

  private readonly fetchHistoryDataFirst = 10;

  private readonly fetchDailyStatisticsFirst = 10;

  private needSyncLockConfirmed = true;

  // burn and redeem
  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_BACKING');

  private needSyncBurnConfirmed = true;

  private readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  private isSyncingHistory = false;

  private isSyncingStatistics = false;

  constructor(
    private configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService
  ) {}

  private get issuingChain() {
    return this.isTest ? 'pangoro' : 'darwinia';
  }

  private get backingChain() {
    return this.isTest ? 'pangolin' : 'crab';
  }

  private get lockFeeToken() {
    return this.isTest ? 'PRING' : 'RING';
  }

  private get burnFeeToken() {
    return this.isTest ? 'PRING' : 'CRAB';
  }

  private get prefix() {
    return `${this.issuingChain}2${this.backingChain}dvm`;
  }

  async onModuleInit() {
    this.taskService.addInterval(
      `${this.prefix}-fetch_history_data`,
      this.fetchHistoryDataInterval,
      async () => {
        if (this.isSyncingHistory) {
          return;
        }
        this.isSyncingHistory = true;
        await this.fetchLockRecords();
        await this.checkConfirmedLockRecords();
        await this.fetchBurnRecords();
        await this.checkConfirmedBurnRecords();
        this.isSyncingHistory = false;
      }
    );
    this.taskService.addInterval(
      `${this.prefix}-fetch_statistics_data`,
      this.fetchDailyStatisticsInterval,
      async () => {
        if (this.isSyncingStatistics) {
          return;
        }
        this.isSyncingStatistics = true;
        await this.fetchDailyStatisticsFromIssuing();
        await this.fetchDailyStatisticsFromBacking();
        this.isSyncingStatistics = false;
      }
    );
  }

  async fetchLockRecords() {
    try {
      const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
        fromChain: this.issuingChain,
        toChain: this.backingChain + '-dvm',
        bridge: 'helix',
      });

      const latestNonce = firstRecord ? firstRecord.nonce : -1;

      const res = await axios.post(this.issuingUrl, {
        query: `query { s2sEvents (first: ${this.fetchHistoryDataFirst}, orderBy: NONCE_ASC, filter: {nonce: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`,
        variables: null,
      });

      const nodes = res.data?.data?.s2sEvents?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;
      const token = this.isTest ? 'ORING' : 'RING';

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: `${this.prefix}-lock-${node.id}`,
            fromChain: this.issuingChain,
            toChain: `${this.backingChain}-dvm`,
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
          });

          if (!this.needSyncLockConfirmed && node.result == 0) {
            this.needSyncLockConfirmed = true;
          }
        }

        this.logger.log(
          `save new ${this.issuingChain} to ${this.backingChain} DVM lock records success, latestNonce: ${latestNonce}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `fetch ${this.issuingChain} to ${this.backingChain} DVM lock records failed ${e}`
      );
    }
  }

  async checkConfirmedLockRecords() {
    if (!this.needSyncLockConfirmed) {
      return;
    }

    try {
      const { records: unconfirmedRecords } = await this.aggregationService.queryHistoryRecords({
        take: this.fetchHistoryDataFirst,
        where: {
          fromChain: this.issuingChain,
          toChain: `${this.backingChain}-dvm`,
          bridge: 'helix',
          result: 0,
        },
      });

      if (unconfirmedRecords.length == 0) {
        this.needSyncLockConfirmed = false;
        return;
      }

      const targetNonces = [];

      for (const record of unconfirmedRecords) {
        targetNonces.push('"' + record.nonce + '"');
      }

      const nonces = targetNonces.join(',');

      const res = await axios.post(this.issuingUrl, {
        query: `query { s2sEvents (filter: {nonce: {in: [${nonces}]}}) { nodes{id, responseTxHash, result, endTimestamp }}}`,
        variables: null,
      });

      const nodes = res.data?.data?.s2sEvents?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;

      if (nodes && nodes.length > 0) {
        let newRecordUpdated = false;

        for (const node of nodes) {
          if (node.result === 0) {
            continue;
          }

          newRecordUpdated = true;

          await this.aggregationService.updateHistoryRecord({
            where: {
              id: `${this.prefix}-lock-${node.id}`,
            },
            data: {
              responseTxHash: node.responseTxHash,
              endTime: getUnixTime(new Date(node.endTimestamp)) - timezone,
              result: node.result,
            },
          });
        }

        if (newRecordUpdated) {
          this.logger.log(
            `update ${this.issuingChain} to ${this.backingChain} DVM lock records success, nonces: ${nonces}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(
        `update ${this.issuingChain} to ${this.backingChain} DVM lock records failed ${e}`
      );
    }
  }

  // burn
  async fetchBurnRecords() {
    try {
      const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
        fromChain: `${this.backingChain}-dvm`,
        toChain: this.issuingChain,
        bridge: 'helix',
      });

      const latestNonce = firstRecord ? firstRecord.nonce : -1;

      const res = await axios.post(this.backingUrl, {
        query: `query { burnRecordEntities (first: ${this.fetchHistoryDataFirst}, orderBy: nonce, orderDirection: asc, where: { nonce_gt: ${latestNonce} }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
        variables: null,
      });

      const nodes = res.data?.data?.burnRecordEntities;
      const token = this.isTest ? 'xORING' : 'xRING';

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: `${this.prefix}-burn-${node.id}`,
            fromChain: `${this.backingChain}-dvm`,
            toChain: this.issuingChain,
            bridge: 'helix',
            laneId: node.lane_id,
            nonce: global.BigInt(node.nonce),
            requestTxHash: node.request_transaction,
            responseTxHash: node.response_transaction,
            sender: node.sender,
            recipient: node.recipient,
            token,
            amount: node.amount,
            startTime: Number(node.start_timestamp),
            endTime: Number(node.end_timestamp),
            result: node.result,
            fee: node.fee.toString(),
            feeToken: this.burnFeeToken,
          });

          if (!this.needSyncBurnConfirmed && node.result == 0) {
            this.needSyncBurnConfirmed = true;
          }
        }
        this.logger.log(
          `save new ${this.backingChain} DVM to ${this.issuingChain} burn records success, latestNonce: ${latestNonce}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `fetch ${this.backingChain} DVM to ${this.issuingChain} burn records failed ${e}`
      );
    }
  }

  async checkConfirmedBurnRecords() {
    if (!this.needSyncBurnConfirmed) {
      return;
    }

    try {
      const { records: unconfirmedRecords } = await this.aggregationService.queryHistoryRecords({
        take: this.fetchHistoryDataFirst,
        where: {
          fromChain: 'crab-dvm',
          toChain: 'darwinia',
          bridge: 'helix',
          result: 0,
        },
      });

      if (unconfirmedRecords.length <= 1) {
        this.needSyncBurnConfirmed = false;
        return;
      }

      const targetNonces = [];

      for (const record of unconfirmedRecords) {
        targetNonces.push(record.nonce);
      }

      const nonces = targetNonces.join(',');

      const res = await axios.post(this.backingUrl, {
        query: `query { burnRecordEntities (where: { nonce_in: [${nonces}] }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
        variables: null,
      });

      const nodes = res.data?.data?.burnRecordEntities;

      if (nodes && nodes.length > 0) {
        let newRecordUpdated = false;

        for (const node of nodes) {
          if (node.result === 0) {
            continue;
          }
          newRecordUpdated = true;

          await this.aggregationService.updateHistoryRecord({
            where: {
              id: `${this.prefix}-burn-${node.id}`,
            },
            data: {
              responseTxHash: node.response_transaction,
              endTime: Number(node.end_timestamp),
              result: node.result,
            },
          });
        }

        if (newRecordUpdated) {
          this.logger.log(
            `update ${this.backingChain} DVM to ${this.issuingChain} burn records success, nonces: ${nonces}`
          );
        }
      }
    } catch (e) {
      this.logger.warn(
        `update ${this.backingChain} DVM to ${this.issuingChain} burn records failed ${e}`
      );
    }
  }

  async fetchDailyStatisticsFromIssuing() {
    try {
      const firstRecord = await this.aggregationService.queryDailyStatisticsFirst({
        fromChain: this.issuingChain,
        toChain: this.backingChain + '-dvm',
        bridge: 'helix',
      });

      const latestDay = firstRecord ? firstRecord.timestamp : -1;

      const res = await axios.post(this.issuingUrl, {
        query: `query { s2sDailyStatistics (first: ${this.fetchDailyStatisticsFirst}, orderBy: ID_ASC, filter: {id: {greaterThan: "${latestDay}"}}) {nodes{id, dailyVolume, dailyCount}}}`,
        variables: null,
      });

      const nodes = res.data?.data?.s2sDailyStatistics?.nodes;

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createDailyStatistics({
            fromChain: this.issuingChain,
            toChain: `${this.backingChain}-dvm`,
            bridge: 'helix',
            timestamp: Number(node.id),
            token: 'native-ring',
            dailyVolume: global.BigInt(node.dailyVolume),
            dailyCount: node.dailyCount,
          });
        }

        this.logger.log(
          `save new ${this.backingChain} DVM to ${this.issuingChain} daily statistics from issuing success, latestDay: ${latestDay}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `fetch ${this.backingChain} DVM to ${this.issuingChain} daily statistics from issuing records failed ${e}`
      );
    }
  }

  async fetchDailyStatisticsFromBacking() {
    try {
      const firstRecord = await this.aggregationService.queryDailyStatisticsFirst({
        fromChain: this.backingChain + '-dvm',
        toChain: this.issuingChain,
        bridge: 'helix',
      });

      const latestDay = firstRecord ? firstRecord.timestamp : -1;

      const res = await axios.post(this.backingUrl, {
        query: `query { burnDailyStatistics (first: ${this.fetchDailyStatisticsFirst}, orderBy: id, orderDirection: asc, where: {id_gt: "${latestDay}"}) {id, dailyVolume, dailyCount}}`,
        variables: null,
      });

      const nodes = res.data?.data?.burnDailyStatistics;

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createDailyStatistics({
            fromChain: `${this.backingChain}-dvm`,
            toChain: this.issuingChain,
            bridge: 'helix',
            timestamp: Number(node.id),
            token: 'native-ring',
            dailyVolume: global.BigInt(node.dailyVolume),
            dailyCount: node.dailyCount,
          });
        }

        this.logger.log(
          `save new ${this.issuingChain} to ${this.backingChain} DVM daily statistics from backing success, latestDay: ${latestDay}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `fetch ${this.issuingChain} to ${this.backingChain} DVM daily statistics from backing records failed ${e}`
      );
    }
  }
}
