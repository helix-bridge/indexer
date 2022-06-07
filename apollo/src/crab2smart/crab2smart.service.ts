import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class Crab2smartService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_ISSUING');

  private readonly fetchDataInterval = 10000;

  private readonly fetchDataFirst = 10;

  private readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(
    private configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService
  ) {}

  private get chain() {
    return this.isTest ? 'pangolin' : 'crab';
  }

  private get prefix() {
    return `${this.chain}2${this.chain}dvm`;
  }

  async onModuleInit() {
    this.taskService.addInterval(`${this.prefix}-fetch_data`, this.fetchDataInterval, () =>
      this.fetchRecords()
    );
  }

  async fetchRecords() {
    try {
      const chainDvm = this.chain + '-dvm';

      const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
        OR: [
          { fromChain: this.chain, toChain: chainDvm },
          { fromChain: chainDvm, toChain: this.chain },
        ],
        bridge: 'helix',
      });

      let latestNonce: number = firstRecord ? Number(firstRecord.nonce) : 0;

      const res = await axios.post(this.backingUrl, {
        query: `query { transfers (first: ${this.fetchDataFirst}, orderBy: TIMESTAMP_ASC, offset: ${latestNonce}) { totalCount nodes{id, senderId, recipientId, fromChain, toChain, amount, timestamp }}}`,
        variables: null,
      });

      const nodes = res.data?.data?.transfers?.nodes;
      const timezone = new Date().getTimezoneOffset() * 60;
      const token = this.isTest ? 'PRing' : 'Crab';

      if (nodes) {
        for (const node of nodes) {
          latestNonce = latestNonce + 1;
          await this.aggregationService.createHistoryRecord({
            id: `${this.prefix}-${node.id}`,
            fromChain: node.fromChain,
            toChain: node.toChain,
            bridge: 'helix',
            laneId: '0',
            nonce: latestNonce.toString(),
            requestTxHash: node.id,
            responseTxHash: node.id,
            sender: node.senderId,
            recipient: node.recipientId,
            token,
            amount: node.amount,
            startTime: getUnixTime(new Date(node.timestamp)) - timezone,
            endTime: getUnixTime(new Date(node.timestamp)) - timezone,
            result: 1,
            fee: '0',
          });
        }
      }
      this.logger.log(
        `save new ${this.chain} to ${this.chain} DVM records success, latestNonce: ${latestNonce}, added: ${nodes.length}`
      );
    } catch (e) {
      this.logger.warn(`update ${this.chain} to ${this.chain} DVM records failed ${e}`);
    }
  }
}
