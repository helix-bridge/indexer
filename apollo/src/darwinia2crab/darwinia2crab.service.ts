import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class Darwinia2crabService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  // lock and mint
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_ISSUING');

  private readonly fetchLockDataInterval = 10000;

  private readonly updateLockDataInterval = 5000;

  private readonly fetchLockDataFirst = 10;

  private readonly updateLockDataFirst = 10;

  private needSyncLockConfirmed = true;

  // burn and redeem
  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_BACKING');

  private readonly fetchBurnDataInterval = 10000;

  private readonly updateBurnDataInterval = 15000;

  private readonly fetchBurnDataFirst = 10;

  private readonly updateBurnDataFirst = 10;

  private needSyncBurnConfirmed = true;

  private readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

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

  private get prefix() {
    return `${this.issuingChain}2${this.backingChain}dvm`;
  }

  async onModuleInit() {
    this.taskService.addInterval(`${this.prefix}-fetch_lock_data`, this.fetchLockDataInterval, () =>
      this.fetchLockRecords()
    );

    this.taskService.addInterval(
      `${this.prefix}-update_lock_data`,
      this.updateLockDataInterval,
      () => this.checkConfirmedLockRecords()
    );

    this.taskService.addInterval(`${this.prefix}-fetch_burn_data`, this.fetchBurnDataInterval, () =>
      this.fetchBurnRecords()
    );

    this.taskService.addInterval(
      `${this.prefix}-update_burn_data`,
      this.updateBurnDataInterval,
      () => this.checkConfirmedBurnRecords()
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
        query: `query { s2sEvents (first: ${this.fetchLockDataFirst}, orderBy: NONCE_ASC, filter: {nonce: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`,
        variables: null,
      });

      const nodes = res.data?.data?.s2sEvents?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: `${this.prefix}-lock-${node.id}`,
            fromChain: this.issuingChain,
            toChain: `${this.backingChain}-dvm`,
            bridge: 'helix',
            laneId: node.laneId,
            nonce: node.nonce,
            requestTxHash: node.requestTxHash,
            responseTxHash: node.responseTxHash,
            sender: node.senderId,
            recipient: node.recipient,
            token: node.token,
            amount: node.amount,
            startTime: getUnixTime(new Date(node.startTimestamp)) - timezone,
            endTime: getUnixTime(new Date(node.endTimestamp)) - timezone,
            result: node.result,
            fee: node.fee,
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
      const unconfirmedRecords = await this.aggregationService.queryHistoryRecords({
        take: this.updateLockDataFirst,
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
        query: `query { s2sEvents (filter: {nonce: {in: [${nonces}]}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`,
        variables: null,
      });

      const nodes = res.data?.data?.s2sEvents?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;

      if (nodes) {
        for (const node of nodes) {
          if (node.result == 0) {
            continue;
          }

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
        this.logger.log(
          `update ${this.issuingChain} to ${this.backingChain} DVM lock records success, nonces: ${nonces}`
        );
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
        query: `query { burnRecordEntities (first: ${this.fetchBurnDataFirst}, orderBy: nonce, orderDirection: asc, where: { nonce_gt: ${latestNonce} }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
        variables: null,
      });

      const nodes = res.data?.data?.burnRecordEntities;

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: `${this.prefix}-burn-${node.id}`,
            fromChain: `${this.backingChain}-dvm`,
            toChain: this.issuingChain,
            bridge: 'helix',
            laneId: node.lane_id,
            nonce: node.nonce,
            requestTxHash: node.request_transaction,
            responseTxHash: node.response_transaction,
            sender: node.sender,
            recipient: node.recipient,
            token: node.token,
            amount: node.amount,
            startTime: Number(node.start_timestamp),
            endTime: Number(node.end_timestamp),
            result: node.result,
            fee: node.fee.toString(),
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
      const unconfirmedRecords = await this.aggregationService.queryHistoryRecords({
        take: this.updateBurnDataFirst,
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
        for (const node of nodes) {
          if (node.result === 0) {
            continue;
          }

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

        this.logger.log(
          `update ${this.backingChain} DVM to ${this.issuingChain} burn records success, nonces: ${nonces}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `update ${this.backingChain} DVM to ${this.issuingChain} burn records failed ${e}`
      );
    }
  }
}
