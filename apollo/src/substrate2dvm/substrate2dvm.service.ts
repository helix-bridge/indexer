import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { AggregationService } from '../aggregation/aggregation.service';
import { TransferT3, RecordStatus } from '../base/TransferServiceT3';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

@Injectable()
export class Substrate2dvmService implements OnModuleInit {
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
  ) {}

  protected genID(transfer: TransferT3, identifier: string) {
    return `${transfer.source.chain}2${transfer.target.chain}-${identifier}`;
  }

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.taskService.addInterval(
        `${item.source.chain}-dvm-fetch_history_${item.target.chain}`,
        10000,
        async () => {
          if (this.isSyncingHistory[index]) {
            return;
          }
          this.isSyncingHistory[index] = true;
          await this.fetchRecords(item, index);
          this.isSyncingHistory[index] = false;
        }
      );
    });
  }

  protected toUnixTime(time: string) {
    const timezone = new Date().getTimezoneOffset() * 60;
    return getUnixTime(new Date(time)) - timezone;
  }

  async fetchRecords(transfer: TransferT3, index: number) {
    const { source: from, target: to } = transfer;

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

      const query = `query { transfers (first: 10, orderBy: TIMESTAMP_ASC, offset: ${this.latestNonce[index]}) { totalCount nodes{id, section, senderId, recipientId, fromChain, toChain, amount, timestamp }}}`;
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

          const symbol = transfer.symbols.find((item) => item.address === node.section) ?? null;
          if (symbol == null) {
            continue;
          }
          const sendToken = symbol.from;
          const recvToken = symbol.to;

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
            sendToken: sendToken,
            recvToken: recvToken,
            sendAmount: node.amount,
            recvAmount,
            startTime: this.toUnixTime(node.timestamp),
            endTime: this.toUnixTime(node.timestamp),
            result: RecordStatus.success,
            fee: '0',
            feeToken: 'null',
            responseTxHash: node.id,
            reason: '',
            sendTokenAddress: '',
          });

          this.latestNonce[index] += 1;
        }

        this.logger.log(
          `sub2dvm save record successed from ${from.chain} to ${to.chain} latestNonce ${this.latestNonce[index]}, added ${nodes.length}`
        );
      }
    } catch (error) {
      this.logger.warn(`sub2dvm save record failed from ${from.chain} to ${to.chain} ${error}`);
    }
  }
}
