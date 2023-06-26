import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { last } from 'lodash';
import { HistoryRecord } from '../graphql';
import { TasksService } from '../tasks/tasks.service';
import { AggregationService } from '../aggregation/aggregation.service';

export enum RecordStatus {
  pending,
  pendingToRefund,
  pendingToClaim,
  success,
  refunded,
  pendingToConfirmRefund,
  pendingRefundInit,
}

export interface PartnerT1 {
  chain: string;
  url: string;
  feeToken: string;
}

export interface PartnerSymbol {
  from: string;
  to: string;
  address: string;
  toAddress: string;
}

export interface TransferT1 {
  source: PartnerT1;
  target: PartnerT1;
  isLock: boolean;
  bridge: string;
  symbols: PartnerSymbol[];
}

export interface FetchCacheInfo {
  latestNonce: number;
  isSyncingHistory: boolean;
  skip: number;
}

export interface BridgeBaseConfigure {
  name: string;
  fetchHistoryDataFirst: number;
  fetchSendDataInterval: number;
  takeEachTime: number;
}

export abstract class BaseTransferServiceT1 {
  abstract formalChainTransfers: TransferT1[];
  abstract testChainTransfers: TransferT1[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): TransferT1[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}

export abstract class BaseServiceT1 {
  abstract logger: Logger;
  abstract fetchCache: FetchCacheInfo[];
  abstract baseConfigure: BridgeBaseConfigure;
  abstract genID(transfer: TransferT1, id: string): string;
  abstract queryTransfer(transfer: TransferT1, srcTransferId: string);
  abstract nodeIdToTransferId(id: string): string;
  abstract formatTransferId(id: string): string;
  abstract updateRecordStatus(uncheckedRecords: HistoryRecord[], ids: string, transfer: TransferT1);
  abstract fetchRefundResult(ids: string, transfer: TransferT1);

  constructor(
    protected aggregationService: AggregationService,
    protected transferService: BaseTransferServiceT1,
    protected taskService: TasksService
  ) {}

  async init() {
    this.transferService.transfers.forEach((item, index) => {
      const isLock = item.isLock ? 'lock' : 'unlock';
      const prefix = `${item.source.chain}-${item.target.chain}`;
      this.taskService.addInterval(
        `${prefix}-${this.baseConfigure.name}-${isLock}`,
        this.baseConfigure.fetchSendDataInterval,
        async () => {
          this.schedule(item, index);
        }
      );
    });
  }

  protected async schedule(item: TransferT1, index: number) {
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

  async fetchRecords(transfer: TransferT1, index: number) {
    let latestNonce = this.fetchCache[index].latestNonce;
    const { source: from, target: to, symbols } = transfer;
    const isLock = transfer.isLock ? 'lock' : 'unlock';
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: `helix-${this.baseConfigure.name}(${isLock})`,
        }, {nonce: 'desc'});
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
            providerKey: 0,
            lastBlockHash: '',
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

  async fetchStatus(transfer: TransferT1, index: number) {
    const { source: from, target: to } = transfer;
    const isLock = transfer.isLock ? 'lock' : 'unlock';

    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.fetchCache[index].skip,
          take: this.baseConfigure.takeEachTime,
          where: {
            fromChain: from.chain,
            toChain: to.chain,
            bridge: `helix-${this.baseConfigure.name}(${isLock})`,
            responseTxHash: '',
          },
        })
        .then((result) => result.records);
      if (uncheckedRecords.length < this.baseConfigure.takeEachTime) {
        this.fetchCache[index].skip = 0;
      } else {
        this.fetchCache[index].skip += this.baseConfigure.takeEachTime;
      }
      const ids = uncheckedRecords
        .filter((item) => item.reason === '' && item.result !== RecordStatus.pendingToConfirmRefund)
        .map((item) => `${last(item.id.split('-'))}`)
        .join(',');

      if (ids.length > 0) {
        await this.updateRecordStatus(uncheckedRecords, ids, transfer);
      }
      let refunded = 0;
      const unrefunded = [];
      for (const node of uncheckedRecords) {
        if (
          node.result === RecordStatus.pendingToRefund ||
          node.result === RecordStatus.pendingToConfirmRefund
        ) {
          const transferId = this.nodeIdToTransferId(node.id);
          const withdrawInfo = await this.queryTransfer(transfer, transferId);
          if (withdrawInfo && withdrawInfo.withdraw_transaction) {
            refunded += 1;
            await this.aggregationService.updateHistoryRecord({
              where: { id: node.id },
              data: {
                responseTxHash: withdrawInfo.withdraw_transaction,
                endTime: Number(withdrawInfo.withdraw_timestamp),
                result: RecordStatus.refunded,
                //recvToken: node.sendToken,
              },
            });
          } else {
            unrefunded.push(node);
          }
        }
      }

      // query if all the refund tx confirmed or one of them confirmed successed
      if (unrefunded && unrefunded.length > 0) {
        // 1. query refund start tx on target chain
        // 2. query refund result tx on source chain
        const unrefundNodes = unrefunded.map((item) => {
          const transferId = this.nodeIdToTransferId(item.id);
          const formatedTransferId = this.formatTransferId(transferId);
          return { id: formatedTransferId, node: item };
        });

        for (const unrefundNode of unrefundNodes) {
          const nodes = await axios
            .post(to.url, {
              query: `query { refundTransferRecords (where: {source_id: "${unrefundNode.id}"}) { id, source_id, transaction_hash, timestamp }}`,
              variables: null,
            })
            .then((res) => res.data?.data?.refundTransferRecords);

          if (nodes.length == 0) {
            continue;
          }

          const refundIds = nodes.map((item) => `${item.id}`).join(',');

          const [successedResult, size] = await this.fetchRefundResult(refundIds, transfer);
          if (!successedResult) {
            if (size === nodes.length) {
              // all refunds tx failed -> RecordStatus.pendingToRefund
              if (unrefundNode.node.result != RecordStatus.pendingToRefund) {
                const oldStatus = unrefundNode.node.result;
                unrefundNode.node.result = RecordStatus.pendingToRefund;
                this.logger.log(
                  `${this.baseConfigure.name} no refund successed, status from ${oldStatus} to ${RecordStatus.pendingToRefund}`
                );
                // update db
                await this.aggregationService.updateHistoryRecord({
                  where: { id: unrefundNode.node.id },
                  data: {
                    result: RecordStatus.pendingToRefund,
                  },
                });
              }
            } else {
              // some tx not confirmed -> RecordStatus.pendingToConfirmRefund
              if (unrefundNode.node.result != RecordStatus.pendingToConfirmRefund) {
                this.logger.log(
                  `${this.baseConfigure.name} waiting for refund confirmed, id: ${unrefundNode.node.id} old status ${unrefundNode.node.result}`
                );
                unrefundNode.node.result = RecordStatus.pendingToConfirmRefund;
                // update db
                await this.aggregationService.updateHistoryRecord({
                  where: { id: unrefundNode.node.id },
                  data: {
                    result: RecordStatus.pendingToConfirmRefund,
                  },
                });
              }
            }
          }
        }
      }
      if (refunded > 0) {
        this.logger.log(
          `${this.baseConfigure.name} update records, from ${from.chain}, to ${to.chain}, ids ${ids}, refunded ${refunded}`
        );
      }
    } catch (error) {
      this.logger.warn(
        `${this.baseConfigure.name} update record failed, from ${from.chain}, to ${to.chain}, ${error}`
      );
    }
  }
}
