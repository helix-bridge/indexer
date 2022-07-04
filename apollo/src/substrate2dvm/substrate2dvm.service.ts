import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';
import { RecordsService } from '../base/RecordsService';
import { Transfer } from '../base/TransferService';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

@Injectable()
export class Substrate2dvmService extends RecordsService implements OnModuleInit {
  protected isSyncingHistory = new Array(this.transferService.transfers.length).fill(false);

  private latestNonce = -1;

  // unused vars
  protected needSyncLock = [];
  protected needSyncLockConfirmed = [];
  protected needSyncBurn = [];
  protected needSyncBurnConfirmed = [];

  constructor(
    public configService: ConfigService,
    public logger: Logger,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
    super();
  }

  protected genID(transfer: Transfer, identifier: string) {
    return `${transfer.from.chain}2${transfer.to.chain}-${identifier}`;
  }

  async onModuleInit() {
    this.taskService.addInterval(`substrate-dvm-fetch_history_data`, 10000, async () => {
      const transfers = this.transferService.transfers;
      const len = transfers.length;

      for (let index = 0; index < len; index) {
        if (this.isSyncingHistory[index]) {
          continue;
        }

        this.isSyncingHistory[index] = true;
        await this.fetchRecords(transfers[index]);
        this.isSyncingHistory[index] = false;
      }
    });
  }

  async fetchRecords(transfer: Transfer) {
    const { from, to } = transfer;

    try {
      if (this.latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          OR: [
            { fromChain: from.chain, toChain: to.chain },
            { fromChain: to.chain, toChain: from.chain },
          ],
          bridge: 'helix',
        });

        this.latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { transfers (first: 10, orderBy: TIMESTAMP_ASC, offset: ${this.latestNonce}) { totalCount nodes{id, senderId, recipientId, fromChain, toChain, amount, timestamp }}}`;
      const nodes = await axios
        .post(from.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.transfers?.nodes);

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, node.id),
            fromChain: node.fromChain,
            toChain: node.toChain,
            bridge: 'helix',
            laneId: '0',
            nonce: this.latestNonce + 1,
            requestTxHash: node.id,
            responseTxHash: node.id,
            sender: node.senderId,
            recipient: node.recipientId,
            token: from.token,
            amount: node.amount,
            startTime: this.toUnixTime(node.timestamp),
            endTime: this.toUnixTime(node.timestamp),
            result: 1,
            fee: '0',
            feeToken: 'null',
            targetTxHash: node.id,
            bridgeDispatchMethod: '',
          });

          this.latestNonce = this.latestNonce + 1;
        }

        this.logger.log(
          `save new ${from.chain} to ${to.chain} records success, latestNonce: ${this.latestNonce}, added: ${nodes.length}`
        );
      }
    } catch (e) {
      this.logger.warn(
        `update ${from.chain} to ${to.chain} records failed ${e} nonce is ${this.latestNonce}`
      );
    }
  }

  async checkRecords(): Promise<void> {
    // does not need to check
  }

  async checkConfirmedRecords(): Promise<void> {
    // does not need to check
  }
}
