import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { HistoryRecord } from '../graphql';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import {
  TransferT3,
  BaseServiceT3,
  FetchCacheInfo,
  BridgeBaseConfigure,
  RecordStatus,
} from '../base/TransferServiceT3';

enum Sub2EthStatus {
  pending = 1,
  success = 2,
  failed = 3,
}

@Injectable()
export class Sub2ethv2Service extends BaseServiceT3 implements OnModuleInit {
  logger: Logger = new Logger('sub2ethv2');
  baseConfigure: BridgeBaseConfigure = {
    name: 'sub2subv21',
    fetchHistoryDataFirst: 10,
    fetchSendDataInterval: 3000,
    takeEachTime: 3,
  };

  fetchCache: FetchCacheInfo[] = new Array(this.transferService.transfers.length)
    .fill('')
    .map((_) => ({ latestNonce: -1, isSyncingHistory: false, skip: 0 }));

  constructor(
    public configService: ConfigService,
    protected aggregationService: AggregationService,
    protected taskService: TasksService,
    protected transferService: TransferService
  ) {
    super(aggregationService, transferService, taskService);
  }

  private subStatus2RecordStatus(s: Sub2EthStatus) {
    if (s === Sub2EthStatus.pending) {
      return RecordStatus.pendingToClaim;
    } else if (s === Sub2EthStatus.success) {
      return RecordStatus.success;
    } else {
      return RecordStatus.pendingToRefund;
    }
  }

  async onModuleInit() {
    this.init();
  }

  // two directions must use the same laneId
  genID(transfer: TransferT3, id: string): string {
    const isLock = transfer.isLock ? 'lock' : 'unlock';
    return `${transfer.source.chain}2${transfer.target.chain}-${this.baseConfigure.name}(${isLock})-${id}`;
  }

  async queryTransfer(transfer: TransferT3, srcTransferId: string) {
    const query = `query { transferRecord(id: "${srcTransferId}") {withdraw_timestamp, withdraw_transaction}}`;
    return await axios
      .post(transfer.source.url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.transferRecord);
  }

  nodeIdToTransferId(id: string): string {
    return last(id.split('-'));
  }

  formatTransferId(id: string): string {
    if (id.length % 2 === 0) {
      return id;
    } else {
      return `"0x0${id.substring(2)}"`;
    }
  }

  async updateRecordStatus(uncheckedRecords: HistoryRecord[], ids: string, transfer: TransferT3) {
    const nodes = await axios
      .post(this.transferService.dispatchEndPoints[transfer.target.chain.split('-')[0]], {
        query: `query { messageDispatchedResults (where: {id_in: [${ids}]}) { id, token, transaction_hash, result, timestamp }}`,
        variables: null,
      })
      .then((res) => res.data?.data?.messageDispatchedResults);

    if (nodes && nodes.length > 0) {
      for (const node of nodes) {
        const responseTxHash = node.result === Sub2EthStatus.success ? node.transaction_hash : '';
        const result = this.subStatus2RecordStatus(node.result);
        const record = uncheckedRecords.find((r) => last(r.id.split('-')) === node.id) ?? null;
        if (!record || record.result === result) {
          continue;
        }
        this.logger.log(
          `sub2eth v2 new status id: ${node.id} updated old: ${record.result} new: ${result}`
        );
        await this.aggregationService.updateHistoryRecord({
          where: { id: this.genID(transfer, node.id) },
          data: {
            recvTokenAddress: node.token,
            responseTxHash,
            result,
            endTime: Number(node.timestamp),
          },
        });
      }
    }
  }

  async fetchRefundResult(ids: string, transfer: TransferT3) {
    const refundResults = await axios
      .post(this.transferService.dispatchEndPoints[transfer.source.chain.split('-')[0]], {
        query: `query { messageDispatchedResults (where: {id_in: [${ids}]}) { id, token, transaction_hash, result, timestamp }}`,
        variables: null,
      })
      .then((res) => res.data?.data?.messageDispatchedResults);
    return [
      refundResults.find((r) => r.result === Sub2EthStatus.success) ?? null,
      refundResults.length,
    ];
  }
}
