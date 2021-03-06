import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';
import { RecordsService, RecordStatus } from '../base/RecordsService';
import { Transfer } from '../base/TransferService';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

@Injectable()
export class Substrate2dvmService extends RecordsService implements OnModuleInit {
  private readonly logger = new Logger('Substrate<>DVM');

  protected isSyncingHistory = new Array(this.transferService.transfers.length).fill(false);

  private readonly latestNonce = new Array(this.transferService.transfers.length).fill(-1);

  // unused vars
  protected needSyncLock = [];
  protected needSyncLockConfirmed = [];
  protected needSyncBurn = [];
  protected needSyncBurnConfirmed = [];

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
    super();
  }

  protected genID(transfer: Transfer, identifier: string) {
    return `${transfer.backing.chain}2${transfer.issuing.chain}-${identifier}`;
  }

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.taskService.addInterval(
        `${item.backing.chain}-dvm-fetch_history_data`,
        10000,
        async () => {
          if (this.isSyncingHistory[index]) {
            return;
          }
          this.isSyncingHistory[index] = true;
          await this.fetchRecords(item, '', index);
          this.isSyncingHistory[index] = false;
        }
      );
    });
  }

  async fetchRecords(transfer: Transfer, _, index: number) {
    const { backing: from, issuing: to } = transfer;

    try {
      if (this.latestNonce[index] === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          OR: [
            { fromChain: from.chain, toChain: to.chain },
            { fromChain: to.chain, toChain: from.chain },
          ],
          bridge: 'helix',
        });

        this.latestNonce[index] = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { transfers (first: 10, orderBy: TIMESTAMP_ASC, offset: ${this.latestNonce[index]}) { totalCount nodes{id, senderId, recipientId, fromChain, toChain, amount, timestamp }}}`;
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
            nonce: this.latestNonce[index] + 1,
            requestTxHash: node.id,
            responseTxHash: node.id,
            sender: node.senderId,
            recipient: node.recipientId,
            token: from.token,
            amount: node.amount,
            startTime: this.toUnixTime(node.timestamp),
            endTime: this.toUnixTime(node.timestamp),
            result: RecordStatus.success,
            fee: '0',
            feeToken: 'null',
            targetTxHash: node.id,
            reason: '',
          });

          this.latestNonce[index] += 1;
        }

        this.logger.log(
          this.fetchRecordsLog('Smart', from.chain, to.chain, {
            latestNonce: this.latestNonce[index],
            added: nodes.length,
          })
        );
      }
    } catch (error) {
      this.logger.warn(this.fetchRecordsLog('Smart', from.chain, to.chain, { error }));
    }
  }

  async checkDispatched(): Promise<void> {
    // does not need to check
  }

  async checkConfirmed(): Promise<void> {
    // does not need to check
  }
}
