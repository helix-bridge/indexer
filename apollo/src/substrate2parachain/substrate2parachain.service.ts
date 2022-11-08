import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { getUnixTime } from 'date-fns';
import { AggregationService } from '../aggregation/aggregation.service';
import { Transfer, TransferAction } from '../base/TransferService';
import { SubqlRecord } from '../interface/record';
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

// pangolin -> pangolin parachain
// crab -> crab parachain
// darwinia -> darwinia parachain
@Injectable()
export class Substrate2parachainService implements OnModuleInit {
  private readonly logger = new Logger('Substrate<>Parachain');
  protected fetchSendDataInterval = 20000;
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
      this.taskService.addInterval(
        `${item.source.chain}-sub2para-fetch_history_data`,
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
    return `${transfer.source.chain}2${transfer.target.chain}-sub2para-${id}`;
  }

  private toUnixTime(time: string) {
    const timezone = new Date().getTimezoneOffset() * 60;
    return getUnixTime(new Date(time)) - timezone;
  }

  async fetchSubqlRecords(url: string, latestNonce: number) {
    const query = this.transferService.getRecordFromSubql(this.fetchHistoryDataFirst, latestNonce);
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.transferRecords?.nodes);
  }

  async fetchThegraphRecords(url: string, latestNonce: number) {
    const query = this.transferService.getRecordFromThegraph(
      this.fetchHistoryDataFirst,
      latestNonce
    );
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.transferRecords);
  }

  async fetchRemoteRecords(url: string, latestNonce: number, isSubql: boolean) {
    if (!isSubql) {
      return this.fetchThegraphRecords(url, latestNonce);
    } else {
      return this.fetchSubqlRecords(url, latestNonce);
    }
  }

  async querySubqlTransfer(url: string, srcTransferId: string) {
    const query = `query { transferRecord(id: "${srcTransferId}") {nodes{withdrawtimestamp, withdrawtransaction}}}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.transferRecord.nodes);
  }

  async queryThegraphTransfer(url: string, srcTransferId: string) {
    const query = `query { transferRecord(id: "${srcTransferId}") {withdrawtimestamp, withdrawtransaction}}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.transferRecord);
  }

  async queryTransfer(url: string, srcTransferId: string, isSubql: boolean) {
    if (isSubql) {
      return await this.querySubqlTransfer(url, srcTransferId);
    } else {
      return await this.queryThegraphTransfer(url, srcTransferId);
    }
  }

  async querySubqlRefund(url: string, id: string) {
    return await axios
      .post(url, {
        query: `query { refundTransferRecords (filter: {sourceid: { in: [${id}]}}) { nodes{ id, sourceid, transaction, timestamp }}}`,
        variables: null,
      })
      .then((res) => res.data?.data?.refundTransferRecords.nodes);
  }

  async queryThegraphRefund(url: string, id: string) {
    return await axios
      .post(url, {
        query: `query { refundTransferRecords (where: {sourceid: ${id}}) {id, sourceid, transaction, timestamp }}`,
        variables: null,
      })
      .then((res) => res.data?.data?.refundTransferRecords);
  }

  async queryRefund(url: string, id: string, isSubql: boolean) {
    if (isSubql) {
      return this.querySubqlRefund(url, id);
    } else {
      return this.queryThegraphRefund(url, id);
    }
  }

  async fetchRecords(transfer: TransferT3, index: number) {
    let latestNonce = this.fetchCache[index].latestNonce;
    let { source: from, target: to, isLock } = transfer;

    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: 'helix-sub2para',
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const nodes = await this.fetchRemoteRecords(from.url, latestNonce, !isLock);

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          const amount = BigInt(node.amount);
          const startTime = isLock ? Number(node.timestamp) : this.toUnixTime(node.timestamp);

          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, node.id),
            fromChain: from.chain,
            toChain: to.chain,
            bridge: 'helix-sub2para',
            messageNonce: node.id,
            nonce: global.BigInt(node.id),
            requestTxHash: node.transaction,
            sender: node.sender,
            recipient: node.receiver,
            sendToken: from.feeToken,
            recvToken: to.feeToken,
            sendAmount: amount.toString(),
            recvAmount: amount.toString(),
            startTime: startTime,
            endTime: 0,
            result: 0,
            fee: node.fee,
            feeToken: from.feeToken,
            responseTxHash: '',
            reason: '',
            sendTokenAddress: '',
          });
          latestNonce += 1;
        }

        this.logger.log(
          `sub2para v2 new records, from ${from.chain} to ${to.chain} latest nonce ${latestNonce}, added ${nodes.length}`
        );
      }
      this.fetchCache[index].latestNonce = latestNonce;
    } catch (error) {
      this.logger.warn(
        `sub2para v2 fetch records failed, from ${from.chain} to ${to.chain} ${error}`
      );
    }
  }

  async fetchStatus(transfer: TransferT3, index: number) {
    let { source: from, target: to, isLock } = transfer;
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip[index],
          take: this.takeEachTime,
          where: {
            fromChain: from.chain,
            toChain: to.chain,
            bridge: 'helix-sub2para',
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
          .post(this.transferService.dispatchEndPoints[to.chain], {
            query: `query { bridgeDispatchEvents (filter: {id: {in: [${ids}]}}) { nodes {id, method, block, timestamp }}}`,
            variables: null,
          })
          .then((res) => res.data?.data?.bridgeDispatchEvents.nodes);

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
              `sub2para v2 new status id: ${node.id} updated old: ${record.result} new: ${result}`
            );
            await this.aggregationService.updateHistoryRecord({
              where: { id: this.genID(transfer, node.id) },
              data: {
                responseTxHash,
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
          const transferId = last(node.id.split('-'));
          const withdrawInfo = await this.queryTransfer(from.url, transferId, !isLock);
          if (withdrawInfo && withdrawInfo.withdrawtransaction) {
            refunded += 1;
            await this.aggregationService.updateHistoryRecord({
              where: { id: node.id },
              data: {
                responseTxHash: withdrawInfo.withdrawtransaction,
                endTime: Number(withdrawInfo.withdrawtimestamp),
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
          const transferId: string = last(item.id.split('-'));
          if (transferId.length % 2 === 0) {
            return { id: `"${transferId}"`, node: item };
          } else {
            return { id: `"0x0${transferId.substring(2)}"`, node: item };
          }
        });

        for (const unrefundNode of unrefundNodes) {
          const nodes = await this.queryRefund(to.url, unrefundNode.id, isLock);

          const refundIds = nodes.map((item) => `"${item.id}"`).join(',');

          const refundResults = await axios
            .post(this.transferService.dispatchEndPoints[from.chain], {
              query: `query { bridgeDispatchEvents (filter: {id: {in: [${refundIds}]}}) { nodes {id, method, block, timestamp }}}`,
              variables: null,
            })
            .then((res) => res.data?.data?.bridgeDispatchEvents.nodes);
          const successedResult =
            refundResults.find((r) => r.method === 'MessageDispatched') ?? null;
          if (!successedResult) {
            if (refundResults.length === refundIds.length) {
              // all refunds tx failed -> RecordStatus.pendingToRefund
              if (unrefundNode.node.result != RecordStatus.pendingToRefund) {
                const oldStatus = unrefundNode.node.result;
                unrefundNode.node.result = RecordStatus.pendingToRefund;
                this.logger.log(
                  `sub2para v2 no refund successed, status from ${oldStatus} to ${RecordStatus.pendingToRefund}`
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
                  `sub2para v2 waiting for refund confirmed, id: ${unrefundNode.node.id} old status ${unrefundNode.node.result}`
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
          `sub2para v2 update records, from ${from.chain}, to ${to.chain}, ids ${ids}, refunded ${refunded}`
        );
      }
    } catch (error) {
      this.logger.warn(
        `sub2para v2 update record failed, from ${from.chain}, to ${to.chain}, ${error}`
      );
    }
  }
}
