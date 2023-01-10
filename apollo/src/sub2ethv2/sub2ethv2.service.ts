import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { getUnixTime } from 'date-fns';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { TransferT3, BaseServiceT3, FetchCacheInfo, BridgeBaseConfigure } from '../base/TransferServiceT3';

enum Sub2EthStatus {
  pending = 1,
  success = 2,
  failed = 3,
}

enum RecordStatus {
  pending,
  pendingToRefund,
  pendingToClaim,
  success,
  refunded,
  pendingToConfirmRefund,
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
  genID(transfer: TransferT3, id: string) {
    const isLock = transfer.isLock ? 'lock' : 'unlock';
    return `${transfer.source.chain}2${transfer.target.chain}-${this.baseConfigure.name}(${isLock})-${id}`;
  }

  private getMessageNonceFromId(id: string) {
    return id.substring(10, id.length + 1);
  }

  private toUnixTime(time: string) {
    const timezone = new Date().getTimezoneOffset() * 60;
    return getUnixTime(new Date(time)) - timezone;
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

  async fetchStatus(transfer: TransferT3, index: number) {
    const { source: from, target: to } = transfer;

    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.fetchCache[index].skip,
          take: this.baseConfigure.takeEachTime,
          where: {
            fromChain: from.chain,
            toChain: to.chain,
            bridge: 'helix-sub2ethv2',
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
        .map((item) => `"${last(item.id.split('-'))}"`)
        .join(',');

      if (ids.length > 0) {
        const nodes = await axios
          .post(this.transferService.dispatchEndPoints[to.chain.split('-')[0]], {
            query: `query { messageDispatchedResults (where: {id_in: [${ids}]}) { id, token, transaction_hash, result, timestamp }}`,
            variables: null,
          })
          .then((res) => res.data?.data?.messageDispatchedResults);

        if (nodes && nodes.length > 0) {
          for (const node of nodes) {
            const responseTxHash =
              node.result === Sub2EthStatus.success ? node.transaction_hash : '';
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
      let refunded = 0;
      const unrefunded = [];
      for (const node of uncheckedRecords) {
        if (
          node.result === RecordStatus.pendingToRefund ||
          node.result === RecordStatus.pendingToConfirmRefund
        ) {
          const transferId = last(node.id.split('-'));
          const withdrawInfo = await this.queryTransfer(transfer, transferId);
          if (withdrawInfo && withdrawInfo.withdraw_transaction) {
            refunded += 1;
            await this.aggregationService.updateHistoryRecord({
              where: { id: node.id },
              data: {
                responseTxHash: withdrawInfo.withdraw_transaction,
                endTime: Number(withdrawInfo.withdraw_timestamp),
                result: RecordStatus.refunded,
                recvToken: node.sendToken,
              },
            });
          } else {
            unrefunded.push(node);
          }
        }
      }

      // query if all the refund tx confirmed or one of them confirmed successed
      if (unrefunded.length > 0) {
        // 1. query refund start tx on target chain
        // 2. query refund result tx on source chain
        const unrefundNodes = unrefunded.map((item) => {
          const transferId: string = last(item.id.split('-'));
          if (transferId.length % 2 === 0) {
            return { id: `"${transferId}"`, node: item };
          } else {
            return { id: `"0x0${transferId.substring(2)}"`, node: item };
          }
        });

        for (const unrefundNode of unrefundNodes) {
          const nodes = await axios
            .post(to.url, {
              query: `query { refundTransferRecords (where: {source_id: ${unrefundNode.id}}) { id, source_id, transaction_hash, timestamp }}`,
              variables: null,
            })
            .then((res) => res.data?.data?.refundTransferRecords);

          if (nodes.length == 0) {
            continue;
          }

          const refundIds = nodes.map((item) => `"${item.id}"`).join(',');

          const refundResults = await axios
            .post(this.transferService.dispatchEndPoints[from.chain.split('-')[0]], {
              query: `query { messageDispatchedResults (where: {id_in: [${refundIds}]}) { id, token, transaction_hash, result, timestamp }}`,
              variables: null,
            })
            .then((res) => res.data?.data?.messageDispatchedResults);
          const successedResult =
            refundResults.find((r) => r.result === Sub2EthStatus.success) ?? null;
          if (!successedResult) {
            if (refundResults.length === nodes.length) {
              // all refunds tx failed -> RecordStatus.pendingToRefund
              if (unrefundNode.node.result != RecordStatus.pendingToRefund) {
                const oldStatus = unrefundNode.node.result;
                unrefundNode.node.result = RecordStatus.pendingToRefund;
                this.logger.log(
                  `sub2eth v2 no refund successed, status from ${oldStatus} to ${RecordStatus.pendingToRefund}`
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
                  `sub2eth v2 waiting for refund confirmed, id: ${unrefundNode.node.id} old status ${unrefundNode.node.result}`
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
          `sub2eth v2 update records, from ${from.chain}, to ${to.chain}, ids ${ids}, refunded ${refunded}`
        );
      }
    } catch (error) {
      this.logger.warn(
        `sub2eth v2 update record failed, from ${from.chain}, to ${to.chain}, ${error}`
      );
    }
  }
}
