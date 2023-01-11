import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';
import { TransferT3 } from '../base/TransferServiceT3';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

export enum RecordStatus {
  pending,
  pendingToRefund,
  pendingToClaim,
  success,
  refunded,
}

@Injectable()
export class WtokenService implements OnModuleInit {
  private readonly logger = new Logger('wtoken');
  protected fetchDataInterval = 3000;
  private readonly latestNonce = new Array(this.transferService.transfers.length).fill(-1);

  constructor(
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      const prefix = `${item.source.chain}`;
      this.taskService.addInterval(
        `${prefix}-wtoken-fetch_history_data`,
        this.fetchDataInterval,
        async () => {
          await this.fetchRecords(item, index);
        }
      );
    });
  }

  protected genID(transfer: TransferT3, identifier: string) {
    return `${transfer.source.chain}-wtoken-${identifier}`;
  }

  async fetchRecords(transfer: TransferT3, index: number) {
    try {
      if (this.latestNonce[index] === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: transfer.source.chain,
          bridge: 'helix-wtoken-' + transfer.source.chain,
        });
        this.latestNonce[index] = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = this.transferService.getRecordQueryString(10, this.latestNonce[index]);
      const records = await axios
        .post(transfer.source.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.transferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          const symbol = transfer.symbols[0];
          const sendToken = record.direction === 0 ? symbol.from : symbol.to;
          const recvToken = record.direction === 0 ? symbol.to : symbol.from;
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.id),
            fromChain: transfer.source.chain,
            toChain: transfer.target.chain,
            bridge: 'helix-wtoken-' + transfer.source.chain,
            messageNonce: '',
            nonce: this.latestNonce[index] + 1,
            requestTxHash: record.id,
            sender: record.account,
            recipient: record.account,
            sendToken: sendToken,
            recvToken: recvToken,
            sendAmount: record.amount,
            recvAmount: record.amount,
            startTime: Number(record.timestamp),
            endTime: Number(record.timestamp),
            result: RecordStatus.success,
            fee: '0',
            feeToken: transfer.source.feeToken,
            responseTxHash: record.id,
            reason: '',
            sendTokenAddress: '',
          });
          this.latestNonce[index] += 1;
        }
        this.logger.log(
          `wtoken new records, chain ${transfer.source.chain}, latest nonce ${this.latestNonce[index]}, added ${records.length}`
        );
      }
    } catch (error) {
      this.logger.warn(
        `save new wtoken record failed ${transfer.source.chain}, ${this.latestNonce}, ${error}`
      );
    }
  }
}
