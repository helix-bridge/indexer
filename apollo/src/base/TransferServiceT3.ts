import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { HistoryRecord, Prisma } from '@prisma/client';
import { TasksService } from '../tasks/tasks.service';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';

export interface PartnerT3 {
  chain: string;
  url: string;
  feeToken: string;
}

export interface PartnerSymbol {
  from: string;
  to: string;
  address: string;
}

export interface TransferT3 {
  source: PartnerT3;
  target: PartnerT3;
  isLock: boolean;
  symbols: PartnerSymbol[];
}

export interface FetchCacheInfo {
  latestNonce: number,
  isSyncingHistory: boolean;
  skip: number,
}

export interface BridgeBaseConfigure {
  name: string,
  fetchHistoryDataFirst: number,
  fetchSendDataInterval: number,
  takeEachTime: number,
}

export abstract class BaseTransferServiceT3 {
  abstract formalChainTransfers: TransferT3[];
  abstract testChainTransfers: TransferT3[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): TransferT3[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}

export abstract class BaseServiceT3 {
  abstract logger: Logger;
  abstract fetchCache: FetchCacheInfo[];
  abstract baseConfigure: BridgeBaseConfigure;
  abstract fetchStatus(transfer: TransferT3, index: number);
  abstract genID(transfer: TransferT3, id: string): string;
  
  constructor(
    protected aggregationService: AggregationService,
    protected transferService: BaseTransferServiceT3,
    protected taskService: TasksService,
  ){}

  async init() {
    this.transferService.transfers.forEach((item, index) => {
      const isLock = item.isLock ? 'lock' : 'unlock';
      const prefix = `${item.source.chain}-${item.target.chain}`;
      this.taskService.addInterval(
        `${prefix}-sub2subv21-${isLock}`,
        this.baseConfigure.fetchSendDataInterval,
        async () => {
          this.schedule(item, index);
        }
      );
    });
  }

  protected async schedule(item: TransferT3, index: number) {
    if (this.fetchCache[index].isSyncingHistory) {
        return;
    }
    this.fetchCache[index].isSyncingHistory = true;
    // from source chain
    await this.fetchRecords(item, index);
    // from target chain
    await this.fetchStatus(item, index);
    this.fetchCache[index].isSyncingHistory = false;
  }

  getRecordQueryString(first: number, latestNonce: bigint | number, addressIn: string) {
    return `query { transferRecords (first: ${first}, orderBy: start_timestamp, orderDirection: asc, skip: ${latestNonce}, where: {token_in: [${addressIn}]}) {id, sender, receiver, token, amount, fee, start_timestamp, transaction_hash, is_native}}`;
  }

  async fetchRecords(transfer: TransferT3, index: number) {
    let latestNonce = this.fetchCache[index].latestNonce;
    const { source: from, target: to, symbols } = transfer;
    const isLock = transfer.isLock ? 'lock' : 'unlock';
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: `helix-${this.baseConfigure.name}(${isLock})`,
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const addressIn = symbols.map((item) => `"${item.address}"`).join(',');

      const records = await axios
        .post(from.url, {
          query: this.getRecordQueryString(
              this.baseConfigure.fetchHistoryDataFirst,
              latestNonce,
              addressIn
          ),
          variables: null,
        })
        .then((res) => res.data?.data?.transferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          const symbol = symbols.find((item) => item.address === record.token) ?? null;
          if (!symbol) {
            continue;
          }
          const fromToken =
            record.is_native && symbol.from.indexOf('W') === 0
              ? symbol.from.substring(1)
              : symbol.from;
          const toToken =
            record.is_native && symbol.to.indexOf('W') === 0 ? symbol.to.substring(1) : symbol.to;
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.id),
            sendAmount: record.amount,
            recvAmount: record.amount,
            bridge: `helix-${this.baseConfigure.name}(${isLock})`,
            reason: '',
            endTime: 0,
            fee: record.fee,
            feeToken: from.feeToken,
            fromChain: from.chain,
            messageNonce: record.id,
            nonce: latestNonce + 1,
            recipient: record.receiver,
            requestTxHash: record.transaction_hash,
            result: 0,
            sender: record.sender,
            startTime: Number(record.start_timestamp),
            responseTxHash: '',
            toChain: to.chain,
            sendToken: fromToken,
            recvToken: toToken,
            sendTokenAddress: record.token,
            guardSignatures: null,
          });
          latestNonce += 1;
        }
        this.logger.log(
          `${this.baseConfigure.name} new records, from ${from.chain}, to ${to.chain}, latest nonce ${latestNonce}, added ${records.length}`
        );
      }
      this.fetchCache[index].latestNonce = latestNonce;
    } catch (error) {
      this.logger.warn(
        `${this.baseConfigure.name} fetch record failed, from ${from.chain}, to ${to.chain}, ${error}`
      );
    }
  }
}

