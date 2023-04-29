import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { getUnixTime } from 'date-fns';
import { HistoryRecord } from '../graphql';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import {
  TransferT1,
  BaseServiceT1,
  FetchCacheInfo,
  BridgeBaseConfigure,
  RecordStatus,
} from '../base/TransferServiceT1';

@Injectable()
export class S2sv21Service extends BaseServiceT1 implements OnModuleInit {
  logger: Logger = new Logger('sub2subv21');
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

  async onModuleInit() {
    this.init();
  }
  // two directions must use the same laneId
  genID(transfer: TransferT1, id: string) {
    const fullId = this.transferIdToResultId(id);

    const isLock = transfer.isLock ? 'lock' : 'unlock';
    return `${transfer.source.chain}2${transfer.target.chain}-${this.baseConfigure.name}(${isLock})-${fullId}`;
  }

  transferIdToResultId(id: string) {
    const nonce = id.substring(id.length - 16, id.length + 1);
    const hexNonce = "0x" + nonce.replace(/^0+/, '');
    return this.idAppendLaneId(hexNonce);
  }

  getMessageNonceFromId(id: string) {
    return id.substring(10, id.length + 1);
  }

  private idAppendLaneId(id: string) {
    const laneId = '0x64616362';
    if (!id.startsWith(laneId)) {
        return laneId + id;
    }
    return id;
  }

  private toUnixTime(time: string) {
    const timezone = new Date().getTimezoneOffset() * 60;
    return getUnixTime(new Date(time)) - timezone;
  }

  async queryTransfer(transfer: TransferT1, srcTransferId: string) {
    const transferId = this.formatTransferId(srcTransferId);
    const query = `query { transferRecord(id: "${transferId}") {withdraw_timestamp, withdraw_transaction}}`;
    return await axios
      .post(transfer.source.url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.transferRecord);
  }

  nodeIdToTransferId(id: string): string {
    return this.getMessageNonceFromId(last(id.split('-')));
  }

  formatTransferId(id: string): string {
    return '0x200000000000000000000000000000000000064616362' + id.substring(2, id.length+1).padStart(16, '0');
  }

  async updateRecordStatus(uncheckedRecords: HistoryRecord[], ids: string, transfer: TransferT1) {
    const resultIds = ids.split(',').map((item) => this.idAppendLaneId(item));
    const formatedResultIds = resultIds.map((item) => `"${item}"`).join(',');

    const nodes = await axios
      .post<{ data: { bridgeDispatchEvents: { nodes: any[] } } }>(
        this.transferService.dispatchEndPoints[transfer.target.chain.split('-')[0]],
        {
          query: `query { bridgeDispatchEvents (filter: {id: {in: [${formatedResultIds}]}}) { nodes {id, method, block, timestamp }}}`,
          variables: null,
        }
      )
      .then((res) => res.data?.data?.bridgeDispatchEvents?.nodes);
    if (nodes && nodes.length > 0) {
      for (const node of nodes) {
        const responseTxHash = node.method === 'MessageDispatched' ? node.block.extrinsicHash : '';
        const result =
          node.method === 'MessageDispatched' ? RecordStatus.success : RecordStatus.pendingToRefund;
        const record = uncheckedRecords.find((r) => last(r.id.split('-')) === node.id) ?? null;
        if (!record || record.result === result) {
          continue;
        }
        this.logger.log(
          `sub2sub v21 new status id: ${node.id} updated old: ${record.result} new: ${result}`
        );
        await this.aggregationService.updateHistoryRecord({
          where: { id: record.id },
          data: {
            responseTxHash,
            reason: node.method,
            result,
            endTime: this.toUnixTime(node.timestamp),
          },
        });
      }
    }
  }

  async fetchRefundResult(ids: string, transfer: TransferT1) {
    const resultIds = ids.split(',').map((item) => this.transferIdToResultId(item));
    const formatedResultIds = resultIds.map((item) => `"${item}"`).join(',');

    const refundResults = await axios
      .post<{ data: { bridgeDispatchEvents: { nodes: any[] } } }>(
        this.transferService.dispatchEndPoints[transfer.source.chain.split('-')[0]],
        {
          query: `query { bridgeDispatchEvents (filter: {id: {in: [${formatedResultIds}]}}) { nodes {id, method, block, timestamp }}}`,
          variables: null,
        }
      )
      .then((res) => res.data?.data?.bridgeDispatchEvents?.nodes);
    
    return [
      refundResults.find((r) => r.method === 'MessageDispatched') ?? null,
      refundResults.length,
    ];
  }
}
