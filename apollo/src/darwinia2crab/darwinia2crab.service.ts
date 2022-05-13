import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import axios from 'axios';
import { getUnixTime } from 'date-fns';

@Injectable()
export class Darwinia2crabService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);
  private readonly crabUrl = this.configService.get<string>('THEGRAPH');
  private readonly darwiniaUrl = this.configService.get<string>('SUBQL') + 'darwinia';
  private readonly fetchDataInterval = this.configService.get<number>('FETCH_DATA_INTERVAL');
  private readonly updateDataInterval = this.configService.get<number>('UPDATE_DATA_INTERVAL');
  private readonly fetchDataFirst = this.configService.get<number>('FETCH_DATA_FIRST');
  private readonly updateDataFirst = this.configService.get<number>('UPDATE_DATA_FIRST');
  private needSyncLockConfirmed = false;
  constructor(
      private configService: ConfigService,
      private aggregationService: AggregationService,
      private taskService: TasksService
  ) {}

  async onModuleInit() {
    const self = this;
    this.taskService.addInterval('darwinia2crabdvm-lockdata', this.fetchDataInterval, function() {
        self.fetchLockRecords()
    });
    this.taskService.addInterval('darwinia2crabdvm-updatedata', this.updateDataInterval, function() {
        self.checkConfirmedLockRecords()
    });
  }

  async fetchLockRecords() {
    const first = this.fetchDataFirst;
    try {
      let firstRecord = await this.aggregationService.queryHistoryRecordFirst({ 
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
      if (nodes) {
          for (let node of nodes) {
              await this.aggregationService.createHistoryRecord({
                id: 'darwinia2crabdvm-' + node.id,
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
                startTime: getUnixTime(new Date(node.startTimestamp)),
                endTime: getUnixTime(new Date(node.endTimestamp)),
                result: node.result,
                fee: node.fee,
              });
              if (!this.needSyncLockConfirmed && node.result == 0) {
                this.needSyncLockConfirmed = true;
              }
          }
      }
      this.logger.log(`save new Darwinia to Crab lock records success, latestNonce: ${latestNonce}, added: ${nodes.length}`);
    } catch (e) {
      this.logger.warn(`fetch Darwinia to Crab lock records failed ${e}`);
    }
  }

  async checkConfirmedLockRecords() {
    if (!this.needSyncLockConfirmed) {
        return;
    }
    const first = this.updateDataFirst;
    try {
      let unconfirmedRecords = await this.aggregationService.queryHistoryRecords({ 
        take: first,
        where: {
          fromChain: 'darwinia',
          toChain: 'crab-dvm',
          bridge: 'helix',
        }
      });
      if (unconfirmedRecords.length == 0) {
          this.needSyncLockConfirmed = false;
          return
      }
      var targetNonces = new Array();
      for ( let record of unconfirmedRecords) {
          targetNonces.push(record.nonce)
      }
      let nonces = targetNonces.join(",");
      const res = await axios.post(this.darwiniaUrl, {
        query: `query { s2sEvents (filter: {nonce: {in: [${nonces}]}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`,
        variables: null,
      });
      const nodes = res.data?.data?.s2sEvents?.nodes;
      if (nodes) {
          for (let node of nodes) {
              if (node.result == 0) {
                continue;
              }
              await this.aggregationService.updateHistoryRecord({
                where: {
                  id: 'darwinia2crabdvm-' + node.id,
                },
                data: {
                  responseTxHash: node.responseTxHash,
                  endTime: getUnixTime(new Date(node.endTimestamp)),
                  result: node.result,
                },
              });
          }
      }
      this.logger.log(`update Darwinia to Crab lock records success, nonces: ${nonces}`);
    } catch (e) {
      this.logger.warn(`fetch Darwinia to Crab lock records failed ${e}`);
    }
  }
}

