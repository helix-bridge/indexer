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
        `${item.backing.chain}-dvm-fetch_history_${item.backing.token}`,
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
          bridge: 'helix-s2dvm',
        });

        this.latestNonce[index] = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const section = /kton/i.test(from.token) ? 'kton' : 'balances';
      const query = `query { transfers (first: 10, orderBy: TIMESTAMP_ASC, offset: ${this.latestNonce[index]}, filter: { section: { equalTo: "${section}" }}) { totalCount nodes{id, senderId, recipientId, fromChain, toChain, amount, timestamp }}}`;
      const nodes = await axios
        .post(from.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.transfers?.nodes);

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          const amount = BigInt(node.amount);
          const recvAmount = node.fromChain.includes('dvm')
            ? (amount / BigInt(1e9)).toString()
            : (amount * BigInt(1e9)).toString();

          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, node.id),
            fromChain: node.fromChain,
            toChain: node.toChain,
            bridge: 'helix-s2dvm',
            messageNonce: '0',
            nonce: this.latestNonce[index] + 1,
            requestTxHash: node.id,
            sender: node.senderId,
            recipient: node.recipientId,
            token: from.token,
            sendAmount: node.amount,
            recvAmount,
            startTime: this.toUnixTime(node.timestamp),
            endTime: this.toUnixTime(node.timestamp),
            result: RecordStatus.success,
            fee: '0',
            feeToken: 'null',
            responseTxHash: node.id,
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
