import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2, PartnerSymbol, RecordStatus, Channel } from '../base/TransferServiceT2';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

export enum RelayUpdateType {
  PROVIDER_UPDATE,
  PAUSE_UPDATE,
}

@Injectable()
export class Lnv3Service implements OnModuleInit {
  private readonly logger = new Logger('lnv3');

  private fetchCache = new Array(this.transferService.transfers.length)
    .fill('')
    .map((_) => ({ latestNonce: -1, latestRelayerInfoNonce: -1, isSyncingHistory: false }));

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
        `${item.chain}-${item.bridge}-lnv3-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
          if (this.fetchCache[index].isSyncingHistory) {
            return;
          }
          this.fetchCache[index].isSyncingHistory = true;
          await this.fetchProviderInfo(item, index);
          await this.fetchRecords(item, index);
          await this.fetchStatus(item, index);
          this.fetchCache[index].isSyncingHistory = false;
        }
      );
    });
  }

  private getDestChain(idOrName: string): PartnerT2 | null {
    return (
      this.transferService.transfers.find(
        (transfer) => transfer.chainId.toString() === idOrName || transfer.chain === idOrName
      ) ?? null
    );
  }

  private getTokenInfo(transfer: PartnerT2, addressOrKey: string): PartnerSymbol | null {
    return (
      transfer.symbols.find(
        (symbol) =>
          symbol.key === addressOrKey || symbol.address.toLowerCase() === addressOrKey.toLowerCase()
      ) ?? null
    );
  }

  protected genID(
    transfer: PartnerT2,
    fromChainId: string,
    toChainId: string,
    transferId: string
  ): string {
    return `${transfer.chain.split('-')[0]}-${fromChainId}-${toChainId}-lnv3-${transferId}`;
  }

  async fetchRecords(transfer: PartnerT2, index: number) {
    let latestNonce = this.fetchCache[index].latestNonce;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            fromChain: transfer.chain,
            bridge: `lnv3`,
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { lnv3TransferRecords(first: 10, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}) { id, nonce, messageNonce, remoteChainId, provider, sourceToken, targetToken, sourceAmount, targetAmount, sender, receiver, timestamp, transactionHash, fee, transferId, hasWithdrawn } }`;
      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3TransferRecords);


      if (records && records.length > 0) {
        for (const record of records) {
          const toChain = this.getDestChain(record.remoteChainId.toString());
          if (toChain === null) {
            continue;
          }
          const fromToken = this.getTokenInfo(transfer, record.sourceToken);
          const toToken = this.getTokenInfo(toChain, record.targetToken);

          const responseHash = '';
          const result = RecordStatus.pending;
          const endTime = 0;
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, transfer.chainId.toString(), record.remoteChainId, record.id),
            relayer: record.provider,
            fromChain: transfer.chain,
            toChain: toChain.chain,
            bridge: `lnv3`,
            messageNonce: record.messageNonce,
            nonce: latestNonce + 1,
            requestTxHash: record.transactionHash,
            sender: record.sender,
            recipient: record.receiver,
            sendToken: fromToken.symbol,
            recvToken: toToken.symbol,
            sendAmount: record.sourceAmount,
            recvAmount: record.targetAmount,
            startTime: Number(record.timestamp),
            endTime: endTime,
            result: result,
            fee: record.fee,
            feeToken: fromToken.symbol,
            responseTxHash: responseHash,
            reason: '',
            sendTokenAddress: record.sourceToken,
            recvTokenAddress: record.targetToken,
            endTxHash: '',
            confirmedBlocks: '',
            needWithdrawLiquidity: !record.hasWithdrawn,
            lastRequestWithdraw: 0,
          });
          latestNonce += 1;
          this.logger.log(
            `lnv3 [${transfer.chain}->${toChain.chain}] save new send record succeeded nonce: ${latestNonce}, id: ${record.id}`
          );
        }

        this.fetchCache[index].latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(
        `lnv3 [${transfer.chain}->] save new send record failed ${latestNonce}, ${error}`
      );
    }
  }

  async fetchStatus(transfer: PartnerT2, index: number) {
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip[index],
          take: this.takeEachTime,
          where: {
            fromChain: transfer.chain,
            bridge: `lnv3`,
            endTxHash: '',
          },
        })
        .then((result) => result.records);

      if (uncheckedRecords.length < this.takeEachTime) {
        this.skip[index] = 0;
      } else {
        this.skip[index] += this.takeEachTime;
      }

      for (const record of uncheckedRecords) {
        const recordSplitted = record.id.split('-');
        const transferId = last(recordSplitted);
        const dstChainId = recordSplitted[2];

        if (record.endTxHash === '') {
          const toChain = this.getDestChain(dstChainId);
          const query = `query { lnv3RelayRecord(id: "${transferId}") { id, relayer, timestamp, transactionHash, slashed, requestWithdrawTimestamp, fee }}`;
          const relayRecord = await axios
            .post(toChain.url, {
              query: query,
              variables: null,
            })
            .then((res) => res.data?.data?.lnv3RelayRecord);

          if (relayRecord) {
            let needWithdrawLiquidity = record.needWithdrawLiquidity;
            let requestWithdrawTimestamp = Number(relayRecord.requestWithdrawTimestamp);
            let endTxHash = record.endTxHash;
            if (record.result !== RecordStatus.success) {
              const providerId = this.genRelayInfoID(
                transfer.chainId,
                toChain.chainId,
                record.relayer,
                record.sendTokenAddress
              );
              const relayerInfo = await this.aggregationService.queryLnBridgeRelayInfoById({
                id: providerId,
              });
              // waiting for relayer info update
              if (!relayerInfo) {
                this.logger.log(
                  `lnv3 [${transfer.chain}->${toChain.chain}] waiting for relayer info update, id: ${providerId}`
                );
                continue;
              }

              if (relayRecord.slashed) {
                needWithdrawLiquidity = false;
              }
              if (!needWithdrawLiquidity) {
                endTxHash = relayRecord.transactionHash;
              }
              const updateData = {
                result: RecordStatus.success,
                responseTxHash: relayRecord.transactionHash,
                endTxHash: endTxHash,
                endTime: Number(relayRecord.timestamp),
                relayer: relayRecord.relayer,
                needWithdrawLiquidity: needWithdrawLiquidity,
                lastRequestWithdraw: requestWithdrawTimestamp,
              };

              await this.aggregationService.updateHistoryRecord({
                where: { id: record.id },
                data: updateData,
              });
              
              const cost = relayRecord.slashed ? 0 : relayRecord.fee;
              const profit = relayRecord.slashed ? 0 : record.fee;
              
              await this.aggregationService.updateLnBridgeRelayInfo({
                where: { id: providerId },
                data: {
                  cost: (BigInt(relayerInfo.cost) + BigInt(cost)).toString(),
                  profit: (BigInt(relayerInfo.profit) + BigInt(profit)).toString(),
                },
              });

              this.logger.log(
                `lnv3 [${transfer.chain}->${toChain.chain}] new status id: ${record.id} relayed responseTxHash: ${relayRecord.transactionHash}`
              );
            }
            // query withdrawLiquidity result
            if (needWithdrawLiquidity && requestWithdrawTimestamp > 0) {
              // query result on source
              const query = `query { lnv3TransferRecord(id: "${transferId}") { id, hasWithdrawn }}`;
              const transferRecord = await axios
              .post(transfer.url, {
                query: query,
                variables: null,
              })
              .then((res) => res.data?.data?.lnv3TransferRecord);
              if (transferRecord && (transferRecord.hasWithdrawn || record.lastRequestWithdraw < requestWithdrawTimestamp)) {
                await this.aggregationService.updateHistoryRecord({
                  where: { id: record.id },
                  data: {
                    needWithdrawLiquidity: !transferRecord.hasWithdrawn,
                    endTxHash: transferRecord.responseTxHash,
                    lastRequestWithdraw: requestWithdrawTimestamp,
                  },
                });
                this.logger.log(
                  `lnv3 [${transfer.chain}->${toChain.chain}] tx withdrawn id: ${record.id}, time: ${requestWithdrawTimestamp}, done: ${transferRecord.hasWithdrawn}`
                );
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`fetch lnv3 status failed, error ${error}`);
    }
  }

  private genRelayInfoID(
    fromChainId: number,
    toChainId: number,
    provider: string,
    sourceToken: string
  ): string {
    return `lnv3-${fromChainId}-${toChainId}-${provider}-${sourceToken}`;
  }

  private getMessageChannel(transfer: PartnerT2, toChain: string): Channel | null {
    return transfer.channels.find((channel) => channel.chain === toChain) ?? null;
  }

  async fetchProviderInfo(transfer: PartnerT2, index: number) {
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnBridgeRelayInfoFirst(
          {
            version: 'lnv3',
            fromChain: transfer.chain,
            bridge: `lnv3`,
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv3RelayUpdateRecords(first: 10, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, penalty, baseFee, liquidityFeeRate, transferLimit, paused } }`;

      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3RelayUpdateRecords)
        .catch((err) => {
          this.logger.warn(`query relay update record failed err ${err}`);
        });

      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(
          transfer.chainId,
          record.remoteChainId,
          record.provider,
          record.sourceToken
        );
        const relayerInfo = await this.aggregationService.queryLnBridgeRelayInfoById({
          id: id,
        });
        const toChain = this.getDestChain(record.remoteChainId.toString());
        if (toChain === null) {
          latestNonce += 1;
          this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
          this.logger.warn(`cannot find toChain, id ${record.remoteChainId}`);
          continue;
        }
        const penalty = record.penalty ?? '0';
        if (!relayerInfo) {
          const fromToken = this.getTokenInfo(transfer, record.sourceToken);
          const channel = this.getMessageChannel(transfer, toChain.chain);
          if (fromToken === null || channel === null) {
            latestNonce += 1;
            this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
            this.logger.warn(`cannot find fromToken or channel, channel ${channel}`);
            continue;
          }
          // if not exist create
          await this.aggregationService.createLnBridgeRelayInfo({
            id: id,
            version: 'lnv3',
            fromChain: transfer.chain,
            toChain: toChain.chain,
            bridge: `lnv3`,
            nonce: latestNonce + 1,
            relayer: record.provider,
            sendToken: record.sourceToken,
            transactionHash: record.transactionHash,
            timestamp: Number(record.timestamp),
            margin: penalty,
            protocolFee: BigInt(fromToken.protocolFee).toString(),
            baseFee: BigInt(record.baseFee ?? 0).toString(),
            liquidityFeeRate: Number(record.liquidityFeeRate),
            slashCount: 0,
            withdrawNonce: 0,
            targetNonce: 0,
            lastTransferId: '0x0000000000000000000000000000000000000000000000000000000000000000',
            cost: '0',
            profit: '0',
            heartbeatTimestamp: 0,
            transferLimit: record.transferLimit ?? '0',
            paused: record.paused ?? false,
            messageChannel: channel.channel,
          });
        } else {
          // else update
          const updateData = {
            timestamp: Number(record.timestamp),
            nonce: latestNonce + 1,
            margin: relayerInfo.margin,
            baseFee: BigInt(relayerInfo.baseFee).toString(),
            liquidityFeeRate: relayerInfo.liquidityFeeRate,
            transferLimit: relayerInfo.transferLimit,
            paused: relayerInfo.paused,
          };
          if (record.updateType == RelayUpdateType.PROVIDER_UPDATE) {
            updateData.margin = penalty;
            updateData.baseFee = BigInt(record.baseFee).toString();
            updateData.liquidityFeeRate = Number(record.liquidityFeeRate);
            updateData.transferLimit = record.transferLimit ?? '0';
          } else if (record.updateType == RelayUpdateType.PAUSE_UPDATE) {
            updateData.paused = record.paused;
          }
          await this.aggregationService.updateLnBridgeRelayInfo({
            where: { id: id },
            data: updateData,
          });
        }
        latestNonce += 1;
        this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
        this.logger.log(
          `lnv3 [${transfer.chain}->${toChain.chain}] update relayer info, id ${id}, type ${record.updateType}, margin ${record.penalty}, basefee ${record.baseFee}, liquidityFee ${record.liquidityFeeRate}`
        );
      }
    } catch (error) {
      this.logger.warn(`fetch lnv3bridge relayer records failed, error ${error}`);
    }
  }
}
