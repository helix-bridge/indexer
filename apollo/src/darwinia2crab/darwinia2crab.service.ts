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
  private readonly darwiniaUrl = this.configService.get<string>('SUBQL') + 'darwinia';
  private readonly fetchLockDataInterval = this.configService.get<number>(
    'FETCH_DARWINIA_TO_CRAB_LOCK_DATA_INTERVAL'
  );
  private readonly updateLockDataInterval = this.configService.get<number>(
    'UPDATE_DARWINIA_TO_CRAB_LOCK_DATA_INTERVAL'
  );
  private readonly fetchLockDataFirst = this.configService.get<number>(
    'FETCH_DARWINIA_TO_CRAB_LOCK_DATA_FIRST'
  );
  private readonly updateLockDataFirst = this.configService.get<number>(
    'UPDATE_DARWINIA_TO_CRAB_LOCK_DATA_FIRST'
  );
  private needSyncLockConfirmed = true;

  // burn and redeem
  private readonly crabUrl = this.configService.get<string>('THEGRAPH');
  private readonly fetchBurnDataInterval = this.configService.get<number>(
    'FETCH_DARWINIA_TO_CRAB_BURN_DATA_INTERVAL'
  );
  private readonly updateBurnDataInterval = this.configService.get<number>(
    'UPDATE_DARWINIA_TO_CRAB_BURN_DATA_INTERVAL'
  );
  private readonly fetchBurnDataFirst = this.configService.get<number>(
    'FETCH_DARWINIA_TO_CRAB_BURN_DATA_FIRST'
  );
  private readonly updateBurnDataFirst = this.configService.get<number>(
    'UPDATE_DARWINIA_TO_CRAB_BURN_DATA_FIRST'
  );
  private needSyncBurnConfirmed = true;
  constructor(
    private configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService
  ) {}

  async onModuleInit() {
    this.taskService.addInterval('darwinia2crabdvm-fetchlockdata', this.fetchLockDataInterval, () =>
      this.fetchLockRecords()
    );

    this.taskService.addInterval(
      'darwinia2crabdvm-updatelockdata',
      this.updateLockDataInterval,
      () => this.checkConfirmedLockRecords()
    );

    this.taskService.addInterval('darwinia2crabdvm-fetchburndata', this.fetchBurnDataInterval, () =>
      this.fetchBurnRecords()
    );

    this.taskService.addInterval(
      'darwinia2crabdvm-updateburndata',
      this.updateBurnDataInterval,
      () => this.checkConfirmedBurnRecords()
    );
  }

  async fetchLockRecords() {
    const first = this.fetchLockDataFirst;
    try {
      const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
        fromChain: 'darwinia',
        toChain: 'crab-dvm',
        bridge: 'helix',
      });
      const latestNonce = firstRecord ? firstRecord.nonce : -1;
      const res = await axios.post(this.darwiniaUrl, {
        query: `query { s2sEvents (first: ${first}, orderBy: NONCE_ASC, filter: {nonce: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`,
        variables: null,
      });
      const nodes = res.data?.data?.s2sEvents?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;
      if (nodes) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: 'darwinia2crabdvm-lock-' + node.id,
            fromChain: 'darwinia',
            toChain: 'crab-dvm',
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
      }
      this.logger.log(
        `save new Darwinia to Crab lock records success, latestNonce: ${latestNonce}, added: ${nodes.length}`
      );
    } catch (e) {
      this.logger.warn(`fetch Darwinia to Crab lock records failed ${e}`);
    }
  }

  async checkConfirmedLockRecords() {
    if (!this.needSyncLockConfirmed) {
      return;
    }
    const first = this.updateLockDataFirst;
    try {
      const unconfirmedRecords = await this.aggregationService.queryHistoryRecords({
        take: Number(first),
        where: {
          fromChain: 'darwinia',
          toChain: 'crab-dvm',
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
      const res = await axios.post(this.darwiniaUrl, {
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
              id: 'darwinia2crabdvm-lock-' + node.id,
            },
            data: {
              responseTxHash: node.responseTxHash,
              endTime: getUnixTime(new Date(node.endTimestamp)) - timezone,
              result: node.result,
            },
          });
        }
        this.logger.log(`update Darwinia to Crab lock records success, nonces: ${nonces}`);
      }
    } catch (e) {
      this.logger.warn(`update Darwinia to Crab lock records failed ${e}`);
    }
  }

  // burn
  async fetchBurnRecords() {
    const first = this.fetchBurnDataFirst;
    try {
      const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
        fromChain: 'crab-dvm',
        toChain: 'darwinia',
        bridge: 'helix',
      });
      const latestNonce = firstRecord ? firstRecord.nonce : -1;
      const res = await axios.post(this.crabUrl, {
        query: `query { burnRecordEntities (first: ${first}, orderBy: nonce, orderDirection: asc, where: { nonce_gt: ${latestNonce} }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
        variables: null,
      });
      const nodes = res.data?.data?.burnRecordEntities;
      if (nodes) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: 'darwinia2crabdvm-burn-' + node.id,
            fromChain: 'crab-dvm',
            toChain: 'darwinia',
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
          `save new Darwinia to Crab lock records success, latestNonce: ${latestNonce}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(`fetch Darwinia to Crab lock records failed ${e}`);
    }
  }

  async checkConfirmedBurnRecords() {
    if (!this.needSyncBurnConfirmed) {
      return;
    }
    const take = this.updateBurnDataFirst;
    try {
      const unconfirmedRecords = await this.aggregationService.queryHistoryRecords({
        take: Number(take),
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
      const res = await axios.post(this.crabUrl, {
        query: `query { burnRecordEntities (where: { nonce_in: [${nonces}] }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
        variables: null,
      });
      const nodes = res.data?.data?.burnRecordEntities;
      if (nodes) {
        for (const node of nodes) {
          if (node.result == 0) {
            continue;
          }
          await this.aggregationService.updateHistoryRecord({
            where: {
              id: 'darwinia2crabdvm-burn-' + node.id,
            },
            data: {
              responseTxHash: node.response_transaction,
              endTime: Number(node.end_timestamp),
              result: node.result,
            },
          });
        }
        this.logger.log(`update Darwinia to Crab burn records success, nonces: ${nonces}`);
      }
    } catch (e) {
      this.logger.warn(`update Darwinia to Crab burn records failed ${e}`);
    }
  }
}
