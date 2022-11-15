import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { getUnixTime } from 'date-fns';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { TransferT3 } from '../base/TransferServiceT3';

enum RecordStatus {
  pending,
  pendingToRefund,
  pendingToClaim,
  success,
  refunded,
  pendingToConfirmRefund,
}

@Injectable()
export class S2sv21Service implements OnModuleInit {
  private readonly logger = new Logger('sub2subv21');
  protected fetchSendDataInterval = 10000;
  protected fetchHistoryDataFirst = 10;
  private readonly takeEachTime = 3;
  private skip = new Array(this.transferService.transfers.length).fill(0);

  private fetchCache = new Array(this.transferService.transfers.length)
    .fill('')
    .map((_) => ({ latestNonce: -1, isSyncingHistory: false }));

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      const prefix = `${item.source.chain}-${item.target.chain}`;
      this.taskService.addInterval(
        `${prefix}-sub2subv21-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
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
      );
    });
  }
  // two directions must use the same laneId
  protected genID(transfer: TransferT3, id: string) {
    const fullId = this.idAppendLaneId(id);
    return `${transfer.source.chain}2${transfer.target.chain}-sub2subv21-${fullId}`;
  }

  private getMessageNonceFromId(id: string) {
    return id.substring(10, id.length + 1);
  }

  private idAppendLaneId(id: string) {
    return '0x00000000' + id;
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

  async fetchRecords(transfer: TransferT3, index: number) {
    let latestNonce = this.fetchCache[index].latestNonce;
    const { source: from, target: to, symbols } = transfer;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: 'helix-sub2subv21',
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const records = await axios
        .post(from.url, {
          query: this.transferService.getRecordQueryString(this.fetchHistoryDataFirst, latestNonce),
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
            bridge: 'helix-sub2subv21',
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
          `sub2sub v21 new records, from ${from.chain}, to ${to.chain}, latest nonce ${latestNonce}, added ${records.length}`
        );
      }
      this.fetchCache[index].latestNonce = latestNonce;
    } catch (error) {
      this.logger.warn(
        `sub2sub v21 fetch record failed, from ${from.chain}, to ${to.chain}, ${error}`
      );
    }
  }

  async fetchStatus(transfer: TransferT3, index: number) {
    const { source: from, target: to } = transfer;

    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip[index],
          take: this.takeEachTime,
          where: {
            fromChain: from.chain,
            toChain: to.chain,
            bridge: 'helix-sub2subv21',
            responseTxHash: '',
          },
        })
        .then((result) => result.records);
      if (uncheckedRecords.length < this.takeEachTime) {
        this.skip[index] = 0;
      } else {
        this.skip[index] += this.takeEachTime;
      }
      const ids = uncheckedRecords
        .filter((item) => item.reason === '' && item.result !== RecordStatus.pendingToConfirmRefund)
        .map((item) => `"${last(item.id.split('-'))}"`)
        .join(',');

      if (ids.length > 0) {
        const nodes = await axios
          .post<{ data: { bridgeDispatchEvents: { nodes: any[] } } }>(
            this.transferService.dispatchEndPoints[to.chain.split('-')[0]],
            {
              query: `query { bridgeDispatchEvents (filter: {id: {in: [${ids}]}}) { nodes {id, method, block, timestamp }}}`,
              variables: null,
            }
          )
          .then((res) => res.data?.data?.bridgeDispatchEvents?.nodes);
        if (nodes && nodes.length > 0) {
          for (const node of nodes) {
            const responseTxHash =
              node.method === 'MessageDispatched' ? node.block.extrinsicHash : '';
            const result =
              node.method === 'MessageDispatched'
                ? RecordStatus.success
                : RecordStatus.pendingToRefund;
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
      let refunded = 0;
      const unrefunded = [];
      for (const node of uncheckedRecords) {
        if (
          node.result === RecordStatus.pendingToRefund ||
          node.result === RecordStatus.pendingToConfirmRefund
        ) {
          const transferId = this.getMessageNonceFromId(last(node.id.split('-')));
          const withdrawInfo = await this.queryTransfer(transfer, transferId);
          if (withdrawInfo && withdrawInfo.withdraw_transaction) {
            refunded += 1;
            await this.aggregationService.updateHistoryRecord({
              where: { id: node.id },
              data: {
                responseTxHash: withdrawInfo.withdraw_transaction,
                endTime: Number(withdrawInfo.withdraw_timestamp),
                result: RecordStatus.refunded,
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
          const transferId: string = this.getMessageNonceFromId(last(item.id.split('-')));
          return { id: `"${transferId}"`, node: item };
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
            .post<{ data: { bridgeDispatchEvents: { nodes: any[] } } }>(
              this.transferService.dispatchEndPoints[from.chain.split('-')[0]],
              {
                query: `query { bridgeDispatchEvents (filter: {id: {in: [${refundIds}]}}) { nodes {id, method, block, timestamp }}}`,
                variables: null,
              }
            )
            .then((res) => res.data?.data?.bridgeDispatchEvents?.nodes);

          const successedResult =
            refundResults.find((r) => r.method === 'MessageDispatched') ?? null;
          if (!successedResult) {
            if (refundResults.length === nodes.length) {
              // all refunds tx failed -> RecordStatus.pendingToRefund
              if (unrefundNode.node.result != RecordStatus.pendingToRefund) {
                const oldStatus = unrefundNode.node.result;
                unrefundNode.node.result = RecordStatus.pendingToRefund;
                this.logger.log(
                  `sub2sub v21 no refund successed, status from ${oldStatus} to ${RecordStatus.pendingToRefund}`
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
                  `sub2sub v21 waiting for refund confirmed, id: ${unrefundNode.node.id} old status ${unrefundNode.node.result}`
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
          `sub2sub v21 update records, from ${from.chain}, to ${to.chain}, ids ${ids}, refunded ${refunded}`
        );
      }
    } catch (error) {
      this.logger.warn(
        `sub2sub v21 update record failed, from ${from.chain}, to ${to.chain}, ${error}`
      );
    }
  }
}
