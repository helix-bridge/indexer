import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2, RecordStatus } from '../base/TransferServiceT2';
import { HistoryRecord } from '../graphql';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { Token } from '../base/AddressToken';

@Injectable()
export class LpbridgeService implements OnModuleInit {
  private readonly logger = new Logger('lpbridge');

  private fetchCache = new Array(this.transferService.transfers.length)
    .fill('')
    .map((_) => ({ latestNonce: -1, isSyncingHistory: false }));

  protected fetchSendDataInterval = 10000;

  private readonly takeEachTime = 3;
  private skip = new Array(this.transferService.transfers.length).fill(0);

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.taskService.addInterval(
        `${item.chain}-lpbridge-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
          if (this.fetchCache[index].isSyncingHistory) {
            return;
          }
          this.fetchCache[index].isSyncingHistory = true;
          await this.fetchRecords(item, index);
          await this.fetchStatus(item, index);
          this.fetchCache[index].isSyncingHistory = false;
        }
      );
    });
  }

  private getDestChain(id: number): PartnerT2 | null {
    return this.transferService.transfers.find((transfer) => transfer.chainId === id) ?? null;
  }

  protected genID(transfer: PartnerT2, toChainId: string, transferId: string): string {
    return `${transfer.chain.split('-')[0]}-${toChainId}-lpbridge-${transferId}`;
  }

  async fetchRecords(transfer: PartnerT2, index: number) {
    // the nonce of cBridge message is not increased
    let latestNonce = this.fetchCache[index].latestNonce;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: transfer.chain,
          bridge: 'lpbridge-' + transfer.chain,
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { lpTransferRecords(first: 10, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) { id, sender, receiver, token, amount, transaction_hash, timestamp, fee, is_native, issuing_native, nonce, liquidate_withdrawn_sender, liquidate_transaction_hash, remote_chainid } }`;
      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lpTransferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          const toChain = this.getDestChain(Number(record.remote_chainid));
          const sendTokenInfo = this.transferService.getInfoByKey(transfer.chain, record.token);
          const recvTokenInfo: Token | undefined = this.transferService.findInfoByOrigin(
            toChain.chain,
            sendTokenInfo.origin
          );
          var responseHash = '';
          var result = RecordStatus.pending;
          if (record.liquidate_withdrawn_sender === record.sender) {
            responseHash = record.liquidate_transaction_hash;
            result = RecordStatus.refunded;
          }
          // todo use reason save native
          const reason = record.issuing_native ? 'issuing_native' : 'issuing_erc20';
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.remote_chainid, record.id),
            fromChain: transfer.chain,
            toChain: toChain.chain,
            bridge: 'lpbridge-' + transfer.chain,
            messageNonce: record.nonce,
            nonce: latestNonce + 1,
            requestTxHash: record.transaction_hash,
            sender: record.sender,
            recipient: record.receiver,
            sendToken: sendTokenInfo.token,
            recvToken: recvTokenInfo?.token ?? '',
            sendAmount: record.amount,
            recvAmount: '0',
            startTime: Number(record.timestamp),
            endTime: 0,
            result: result,
            fee: record.fee,
            feeToken: sendTokenInfo.token,
            responseTxHash: responseHash,
            reason: reason,
            sendTokenAddress: record.token,
          });
          latestNonce += 1;
        }

        this.logger.log(
          `save new send record succeeded ${transfer.chain}, nonce: ${latestNonce}, added: ${records.length}`
        );
        this.fetchCache[index].latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(`save new send record failed ${transfer.chain}, ${latestNonce}, ${error}`);
    }
  }

  async fetchStatus(transfer: PartnerT2, index: number) {
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip[index],
          take: this.takeEachTime,
          where: {
            fromChain: transfer.chain,
            bridge: 'lpbridge-' + transfer.chain,
            responseTxHash: '',
          },
        })
        .then((result) => result.records);

      if (uncheckedRecords.length < this.takeEachTime) {
        this.skip[index] = 0;
      } else {
        this.skip[index] += this.takeEachTime;
      }

      for (const record of uncheckedRecords) {
        const recordSplitted = record.id.split('-');
        const transferId = last(recordSplitted);
        const dstChainId = recordSplitted[1];

        const toChain = this.getDestChain(Number(dstChainId));
        const query = `query { lpRelayRecord(id: "${transferId}") { id, timestamp, transaction_hash }}`;
        const relayRecord = await axios
          .post(toChain.url, {
            query: query,
            variables: null,
          })
          .then((res) => res.data?.data?.lpRelayRecord);

        if (relayRecord) {
          const updateData = {
            result: RecordStatus.success,
            responseTxHash: relayRecord.transaction_hash,
            endTime: Number(relayRecord.timestamp),
            reason: 'relayed',
            recvAmount: record.sendAmount,
            recvToken: record.recvToken,
          };

          await this.aggregationService.updateHistoryRecord({
            where: { id: record.id },
            data: updateData,
          });

          this.logger.log(
            `lpbridge new status id: ${record.id} relayed responseTxHash: ${relayRecord.transaction_hash}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(`fetch cbridge status failed, error ${error}`);
    }
  }
}
