import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2, RecordStatus } from '../base/TransferServiceT2';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { Token } from '../base/AddressToken';

@Injectable()
export class L2arbitrumService implements OnModuleInit {
  private readonly logger = new Logger('l2Arbitrumbridge');

  private fetchCache = { latestNonce: -1, isSyncingHistory: false };

  private transferInfo = this.transferService.chainTokenInfo;

  protected fetchSendDataInterval = 10000;

  private readonly takeEachTime = 3;
  private skip = 0;

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  async onModuleInit() {
    if (!this.transferInfo) {
      return;
    }
    this.taskService.addInterval(
      `l2arbitrumbridge-fetch_history_data`,
      this.fetchSendDataInterval,
      async () => {
        if (this.fetchCache.isSyncingHistory) {
          return;
        }
        this.fetchCache.isSyncingHistory = true;
        await this.fetchRecords();
        await this.fetchStatus();
        this.fetchCache.isSyncingHistory = false;
      }
    );
  }

  protected genID(transferId: string): string {
    return `${this.transferInfo.l1Chain.name}-${this.transferInfo.l2Chain.name}-l2arbitrumbridge-${transferId}`;
  }

  async fetchRecords() {
    let latestNonce = this.fetchCache.latestNonce;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: this.transferInfo.l1Chain.name,
          bridge: 'l2arbitrumbridge-' + this.transferInfo.l1Chain.name,
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { l1ToL2TransferRecords(first: 10, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) { id, sender, receiver, token, amount, transaction_hash, timestamp, fee } }`;

      const records = await axios
        .post(this.transferInfo.l1Chain.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.l1ToL2TransferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          const sendTokenInfo = this.transferInfo.l1Chain.tokens[record.token];
          if (!sendTokenInfo) {
            continue;
          }
          const recvTokenInfo = this.transferInfo.l2Chain.tokens[sendTokenInfo.parter];
          await this.aggregationService.createHistoryRecord({
            id: this.genID(record.id),
            fromChain: this.transferInfo.l1Chain.name,
            toChain: this.transferInfo.l2Chain.name,
            bridge: 'l2arbitrumbridge-' + this.transferInfo.l1Chain.name,
            messageNonce: record.id,
            nonce: latestNonce + 1,
            requestTxHash: record.transaction_hash,
            sender: record.sender,
            recipient: record.receiver,
            sendToken: sendTokenInfo.token,
            recvToken: recvTokenInfo.token,
            sendAmount: record.amount,
            recvAmount: '0',
            startTime: Number(record.timestamp),
            endTime: 0,
            result: RecordStatus.pending,
            fee: record.fee,
            feeToken: 'eth',
            responseTxHash: '',
            reason: '',
            sendTokenAddress: record.token,
            recvTokenAddress: sendTokenInfo.parter,
            endTxHash: '',
          });
          latestNonce += 1;
        }

        this.logger.log(
          `save new send record succeeded ${this.transferInfo.l1Chain.name}, nonce: ${latestNonce}, added: ${records.length}`
        );
        this.fetchCache.latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(
        `save new send record failed ${this.transferInfo.l1Chain.name}, ${latestNonce}, ${error}`
      );
    }
  }

  async fetchStatus() {
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip,
          take: this.takeEachTime,
          where: {
            fromChain: this.transferInfo.l1Chain.name,
            bridge: 'l2arbitrumbridge-' + this.transferInfo.l1Chain.name,
            endTxHash: '',
          },
        })
        .then((result) => result.records);

      if (uncheckedRecords.length < this.takeEachTime) {
        this.skip = 0;
      } else {
        this.skip += this.takeEachTime;
      }

      for (const record of uncheckedRecords) {
        const transferId = record.messageNonce;

        // query from dest chain to get status relayed/pendingToConfirmRefund/pending
        let txStatus = record.result;

        if (txStatus === RecordStatus.pending || txStatus === RecordStatus.failed) {
          const nonce = '0x' + transferId.substr(2).padStart(64, '0');
          const query = `query { l1ToL2RelayRecords(where: { nonce_in: [\"${nonce}\"]}) { id, timestamp, transaction_hash, nonce, failure }}`;
          const relayRecords = await axios
            .post(this.transferInfo.l2Chain.url, {
              query: query,
              variables: null,
            })
            .then((res) => res.data?.data?.l1ToL2RelayRecords);

          if (relayRecords && relayRecords.length === 1) {
            const relayRecord = relayRecords[0];
            if (txStatus === RecordStatus.failed && relayRecord.failure) {
              continue;
            }
            txStatus = relayRecord.failure ? RecordStatus.failed : RecordStatus.success;
            const recvAmount = relayRecord.failure ? '0' : record.sendAmount;
            const endTxHash = relayRecord.failure ? '' : relayRecord.transaction_hash;
            const updateData = {
              result: txStatus,
              responseTxHash: relayRecord.transaction_hash,
              recvAmount: recvAmount,
              endTime: Number(relayRecord.timestamp),
              endTxHash: endTxHash,
            };

            await this.aggregationService.updateHistoryRecord({
              where: { id: record.id },
              data: updateData,
            });

            this.logger.log(
              `l2arbitrumbridge new status id: ${record.id} relayed responseTxHash: ${relayRecord.transaction_hash}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(`fetch l2bridge status failed, error ${error}`);
    }
  }
}
