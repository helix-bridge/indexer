import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2 } from '../base/TransferServiceT2';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

@Injectable()
export class XcmService implements OnModuleInit {
  private readonly logger = new Logger('xcm');
  protected fetchSendDataInterval = 10000;
  protected isSyncingHistory = new Array(this.transferService.transfers.length).fill(false);
  private readonly latestNonce = new Array(this.transferService.transfers.length).fill(-1);
  private readonly takeEachTime = 3;
  private skip = new Array(this.transferService.transfers.length).fill(0);

  constructor(
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      const prefix = `${item.chain}`;
      this.taskService.addInterval(
        `${prefix}-xcm-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
          if (this.isSyncingHistory[index]) {
            return;
          }
          this.isSyncingHistory[index] = true;
          // from source chain
          await this.fetchRecords(item, index);
          // from target chain
          await this.fetchStatus(item, index);
          this.isSyncingHistory[index] = false;
        }
      );
    });
  }

  private getDestChain(id: number): PartnerT2 | null {
    return this.transferService.transfers.find((transfer) => transfer.chainId === id) ?? null;
  }

  protected genID(transfer: PartnerT2, toChainId: string, transferId: string): string {
    return `${transfer.chain.split('-')[0]}-${toChainId}-xcm-${transferId}`;
  }

  async fetchRecords(transfer: PartnerT2, index: number) {
    try {
      if (this.latestNonce[index] === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: transfer.chain,
          bridge: 'xcm-' + transfer.chain,
        });
        this.latestNonce[index] = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { xcmSentEvents (first: 10, orderBy: TIMESTAMP_ASC, offset: ${this.latestNonce[index]}) { totalCount nodes{id, txHash, sender, recipient, amount, timestamp, destChainId, token, nonce }}}`;

      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.xcmSentEvents?.nodes);

      if (records && records.length > 0) {
        for (const record of records) {
          const toChain = this.getDestChain(Number(record.destChainId));

          if (toChain === null) {
            this.latestNonce[index] += 1;
            continue;
          }

          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.destChainId, record.id),
            fromChain: transfer.chain,
            toChain: toChain.chain,
            bridge: 'xcm-' + transfer.chain,
            messageNonce: record.nonce.toString(),
            nonce: this.latestNonce[index] + 1,
            requestTxHash: record.txHash,
            sender: record.sender,
            recipient: record.recipient,
            sendToken: record.token,
            recvToken: record.token,
            sendAmount: record.amount,
            recvAmount: '0',
            startTime: Number(record.timestamp),
            endTime: 0,
            result: 0,
            fee: '',
            feeToken: record.token,
            responseTxHash: '',
            reason: '',
            sendTokenAddress: record.token,
          });
          this.latestNonce[index] += 1;
        }

        this.logger.log(
          `save new xcm send record succeeded ${transfer.chain}, nonce: ${this.latestNonce}, added: ${records.length}`
        );
      }
    } catch (error) {
      this.logger.warn(
        `save new xcm send record failed ${transfer.chain}, ${this.latestNonce}, ${error}`
      );
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
            bridge: 'xcm-' + transfer.chain,
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
        const dstChainId = recordSplitted[1];
        const transferId = recordSplitted[3] + '-' + recordSplitted[4];
        const dstChain = this.getDestChain(Number(dstChainId));
        if (dstChain === null) {
          continue;
        }
        const query = `query { xcmReceivedEvent(id: "${transferId}") { id, txHash, recipient, amount, timestamp }}`;
        const node = await axios
          .post(dstChain.url, {
            query: query,
            variables: null,
          })
          .then((res) => res.data?.data?.xcmReceivedEvent);
        if (node === null) {
          continue;
        }
        await this.aggregationService.updateHistoryRecord({
          where: { id: record.id },
          data: {
            responseTxHash: node.txHash,
            recvAmount: node.amount,
            endTime: Number(node.timestamp),
            fee: (global.BigInt(record.sendAmount) - global.BigInt(node.amount)).toString(),
            result: 1,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`fetch xcm status failed, error ${error}`);
    }
  }
}
