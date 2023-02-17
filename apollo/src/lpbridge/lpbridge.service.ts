import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2, RecordStatus } from '../base/TransferServiceT2';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { Token } from '../base/AddressToken';

@Injectable()
export class LpbridgeService implements OnModuleInit {
  private readonly logger = new Logger('lpbridge');

  private fetchCache = new Array(this.transferService.transfers.length)
    .fill('')
    .map((_) => ({ latestNonce: -1, isSyncingHistory: false }));

  protected fetchSendDataInterval = 10000;

  private readonly takeEachTime = 3;
  private skip = new Array(this.transferService.transfers.length).fill(0);

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.taskService.addInterval(
        `${item.chain}-lpbridge-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
          if (this.fetchCache[index].isSyncingHistory) {
            return;
          }
          this.fetchCache[index].isSyncingHistory = true;
          await this.fetchRecords(item, index);
          await this.fetchStatus(item, index);
          this.fetchCache[index].isSyncingHistory = false;
        }
      );
    });
  }

  private getDestChain(id: number, bridge: string): PartnerT2 | null {
    return this.transferService.transfers.find((transfer) => transfer.chainId === id && transfer.bridge === bridge) ?? null;
  }

  protected genID(
    transfer: PartnerT2,
    fromChainId: string,
    toChainId: string,
    transferId: string
  ): string {
    return `${transfer.chain.split('-')[0]}-${fromChainId}-${toChainId}-lpbridge-${transferId}`;
  }

  async fetchRecords(transfer: PartnerT2, index: number) {
    // the nonce of cBridge message is not increased
    let latestNonce = this.fetchCache[index].latestNonce;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: transfer.chain,
          bridge: 'lpbridge-' + transfer.chain,
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { lpTransferRecords(first: 10, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) { id, sender, receiver, token, amount, transaction_hash, timestamp, fee, is_native, issuing_native, nonce, liquidate_withdrawn_sender, liquidate_transaction_hash, liquidate_withdrawn_timestamp, remote_chainid } }`;
      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lpTransferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          const toChain = this.getDestChain(Number(record.remote_chainid), transfer.bridge);
          const sendTokenInfo = this.transferService.getInfoByKey(transfer.chain, record.token);
          const tokenAddress: string | undefined = this.transferService.findInfoByOrigin(
            toChain.chain,
            sendTokenInfo.origin
          );
          const recvTokenInfo: Token | undefined = this.transferService.getInfoByKey(
            toChain.chain,
            tokenAddress
          );

          const fromToken =
            record.is_native && sendTokenInfo.token.indexOf('W') === 0
              ? sendTokenInfo.token.substring(1)
              : sendTokenInfo.token;
          const toToken =
            record.issuing_native && recvTokenInfo.token.indexOf('W') === 0
              ? recvTokenInfo.token.substring(1)
              : recvTokenInfo.token;

          var responseHash = '';
          var result = RecordStatus.pending;
          var endTime = 0;
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, transfer.chainId.toString(), record.remote_chainid, record.id),
            fromChain: transfer.chain,
            toChain: toChain.chain,
            bridge: 'lpbridge-' + transfer.chain,
            messageNonce: record.nonce,
            nonce: latestNonce + 1,
            requestTxHash: record.transaction_hash,
            sender: record.sender,
            recipient: record.receiver,
            sendToken: fromToken,
            recvToken: toToken,
            sendAmount: record.amount,
            recvAmount: '0',
            startTime: Number(record.timestamp),
            endTime: endTime,
            result: result,
            fee: record.fee,
            feeToken: sendTokenInfo.token,
            responseTxHash: responseHash,
            reason: '',
            sendTokenAddress: record.token,
            recvTokenAddress: tokenAddress,
          });
          latestNonce += 1;
        }

        this.logger.log(
          `save new send record succeeded ${transfer.chain}, nonce: ${latestNonce}, added: ${records.length}`
        );
        this.fetchCache[index].latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(`save new send record failed ${transfer.chain}, ${latestNonce}, ${error}`);
    }
  }

  async queryRecord(transfer: PartnerT2, id: string) {
    const query = `query { lpTransferRecord(id: "${id}") { id, fee, liquidate_withdrawn_sender, liquidate_transaction_hash, liquidate_withdrawn_timestamp } }`;
    const record = await axios
      .post(transfer.url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lpTransferRecord);
    return record;
  }

  async fetchStatus(transfer: PartnerT2, index: number) {
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip[index],
          take: this.takeEachTime,
          where: {
            fromChain: transfer.chain,
            bridge: 'lpbridge-' + transfer.chain,
            responseTxHash: '',
          },
        })
        .then((result) => result.records);

      if (uncheckedRecords.length <= this.takeEachTime) {
        this.skip[index] = 0;
      } else {
        this.skip[index] += this.takeEachTime;
      }

      for (const record of uncheckedRecords) {
        const recordSplitted = record.id.split('-');
        const transferId = last(recordSplitted);
        const dstChainId = recordSplitted[2];

        // query from dest chain to get status relayed/pendingToConfirmRefund/pending
        let txStatus = record.result;

        if (txStatus === RecordStatus.pending) {
            const toChain = this.getDestChain(Number(dstChainId), transfer.bridge);
            const query = `query { lpRelayRecord(id: "${transferId}") { id, timestamp, transaction_hash, canceled }}`;
            const relayRecord = await axios
            .post(toChain.url, {
                query: query,
                variables: null,
            })
            .then((res) => res.data?.data?.lpRelayRecord);

            if (relayRecord) {
                txStatus = relayRecord.canceled ? RecordStatus.pendingToConfirmRefund : RecordStatus.success;
                const updateData = {
                    result: txStatus,
                    responseTxHash: relayRecord.canceled ? '' : relayRecord.transaction_hash,
                    endTime: relayRecord.canceled ? 0 : Number(relayRecord.timestamp),
                    recvAmount: record.sendAmount,
                    recvToken: record.recvToken,
                };

                await this.aggregationService.updateHistoryRecord({
                    where: { id: record.id },
                    data: updateData,
                });

                this.logger.log(
                    `lpbridge new status id: ${record.id} relayed responseTxHash: ${relayRecord.transaction_hash}`
                );
            }
        }

        if (txStatus === RecordStatus.pendingToConfirmRefund) {
            const transferRecord = await this.queryRecord(transfer, transferId);
            if (transferRecord) {
                if (transferRecord.liquidate_withdrawn_sender === record.sender) {
                    record.responseTxHash = transferRecord.liquidate_transaction_hash;
                    record.result = RecordStatus.refunded;
                    const updateData = {
                        result: RecordStatus.refunded,
                        responseTxHash: transferRecord.liquidate_transaction_hash,
                        endTime: Number(transferRecord.liquidate_withdrawn_timestamp),
                    };

                    await this.aggregationService.updateHistoryRecord({
                        where: { id: record.id },
                        data: updateData,
                    });
                    this.logger.log(
                        `lpbridge refund id: ${record.id} refund responseTxHash: ${transferRecord.liquidate_transaction_hash}`
                    );
                    return;
                } else if (transferRecord.fee !== record.fee) {
                    const updateData = {
                        fee: transferRecord.fee,
                    };
                    await this.aggregationService.updateHistoryRecord({
                        where: { id: record.id },
                        data: updateData,
                    });
                    this.logger.log(
                        `lpbridge fee updated id: ${record.id} fee: ${record.fee} => ${transferRecord.fee}`
                    );
                }
            }
        }
      }
    } catch (error) {
      this.logger.warn(`fetch cbridge status failed, error ${error}`);
    }
  }
}
