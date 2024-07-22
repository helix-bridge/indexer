import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2, RecordStatus, Level0Indexer } from '../base/TransferServiceT2';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { ChainToken, ChainMessager, ChainCouple } from 'helixconf';

export enum RelayUpdateType {
  PROVIDER_UPDATE,
  PAUSE_UPDATE,
}

@Injectable()
export class Lnv3Service implements OnModuleInit {
  private readonly logger = new Logger('lnv3');

  private fetchCache = new Array(this.transferService.transfers.length).fill('').map((_) => ({
    latestNonce: -1,
    latestRelayerInfoNonce: -1,
    latestFillInfoTimestamp: -1,
    isSyncingHistory: false,
  }));

  protected fetchSendDataInterval = 5000;

  private readonly takeEachTime = 2;
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
        `${item.chainConfig.code}-lnv3-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
          if (this.fetchCache[index].isSyncingHistory) {
            return;
          }
          this.fetchCache[index].isSyncingHistory = true;
          await this.fetchProviderInfo(item, index);
          await this.fetchRecords(item, index);
          await this.batchFetchStatus(item, index);
          await this.fetchStatus(item, index);
          this.fetchCache[index].isSyncingHistory = false;
        }
      );
    });
  }

  private getDestChain(idOrName: string): PartnerT2 | null {
    return (
      this.transferService.transfers.find(
        (transfer) =>
          transfer.chainConfig.id.toString() === idOrName || transfer.chainConfig.code === idOrName
      ) ?? null
    );
  }

  private getTokenInfo(transfer: PartnerT2, address: string): ChainToken | null {
    return (
      transfer.chainConfig.tokens.find(
        (token) => token.address.toLowerCase() === address.toLowerCase()
      ) ?? null
    );
  }

  protected genID(
    transfer: PartnerT2,
    fromChainId: string,
    toChainId: string,
    transferId: string
  ): string {
    if (transferId.startsWith(`${fromChainId}-`)) {
      const rmvedChainId = transferId.replace(`${fromChainId}-`, '');
      return `${transfer.chainConfig.code.split('-')[0]}-${fromChainId}-${toChainId}-lnv3-${rmvedChainId}`;
    } else {
      return `${transfer.chainConfig.code.split('-')[0]}-${fromChainId}-${toChainId}-lnv3-${transferId}`;
    }
  }

  async queryRecordInfo(transfer: PartnerT2, latestNonce: number) {
    if (transfer.level0Indexer === Level0Indexer.ponder) {
      const url = this.transferService.ponderEndpoint;
      const query = `query { lnv3TransferRecords(limit: 50, orderBy: "nonce", orderDirection: "asc", where: {localChainId: "${transfer.chainConfig.id}", nonce_gt: "${latestNonce}"}) { items { id, nonce, messageNonce, remoteChainId, provider, sourceToken, targetToken, sourceAmount, targetAmount, sender, receiver, timestamp, transactionHash, fee, transferId, hasWithdrawn } }}`;
      return await axios
        .post(url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3TransferRecords.items);
    } else {
      const url = transfer.indexerUrl;
      const query = `query { lnv3TransferRecords(first: 20, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}) { id, nonce, messageNonce, remoteChainId, provider, sourceToken, targetToken, sourceAmount, targetAmount, sender, receiver, timestamp, transactionHash, fee, transferId, hasWithdrawn } }`;
      return await axios
        .post(url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3TransferRecords);
    }
  }

  async queryProviderInfo(transfer: PartnerT2, latestNonce: number) {
    if (transfer.level0Indexer === Level0Indexer.ponder) {
      const url = this.transferService.ponderEndpoint;
      const query = `query { lnv3RelayUpdateRecords(limit: 50, orderBy: "nonce", orderDirection: "asc", where: {localChainId: "${transfer.chainConfig.id}", nonce_gt: "${latestNonce}"}) { items { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, penalty, baseFee, liquidityFeeRate, transferLimit, paused } }}`;

      return await axios
        .post(url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3RelayUpdateRecords.items);
    } else {
      const query = `query { lnv3RelayUpdateRecords(first: 50, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, penalty, baseFee, liquidityFeeRate, transferLimit, paused } }`;
      return await axios
        .post(transfer.indexerUrl, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3RelayUpdateRecords);
    }
  }

  async queryRecordRelayStatus(toChain: PartnerT2, transferId: string) {
    const url =
      toChain.level0Indexer === Level0Indexer.ponder
        ? this.transferService.ponderEndpoint
        : toChain.indexerUrl;
    const id =
      toChain.level0Indexer === Level0Indexer.ponder
        ? `${toChain.chainConfig.id}-${transferId}`
        : transferId;
    const query = `query { lnv3RelayRecord(id: "${id}") { id, relayer, timestamp, transactionHash, slashed, requestWithdrawTimestamp, fee }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3RelayRecord);
  }

  async queryRecordWithdrawStatus(transfer: PartnerT2, transferId: string) {
    const url =
      transfer.level0Indexer === Level0Indexer.ponder
        ? this.transferService.ponderEndpoint
        : transfer.indexerUrl;
    const id =
      transfer.level0Indexer === Level0Indexer.ponder
        ? `${transfer.chainConfig.id}-${transferId}`
        : transferId;
    const query = `query { lnv3TransferRecord(id: "${id}") { id, hasWithdrawn }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3TransferRecord);
  }

  async fetchRecords(transfer: PartnerT2, index: number) {
    let latestNonce = this.fetchCache[index].latestNonce;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            fromChain: transfer.chainConfig.code,
            bridge: `lnv3`,
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const records = await this.queryRecordInfo(transfer, latestNonce);

      if (records && records.length > 0) {
        let size = 0;
        for (const record of records) {
          const toChain = this.getDestChain(record.remoteChainId.toString());
          if (toChain === null) {
            this.logger.warn(`fetch record cannot find toChain, id ${record.remoteChainId}`);
            latestNonce += 1;
            this.fetchCache[index].latestNonce = latestNonce;
            continue;
          }
          if (toChain.indexerUrl === null) {
            continue;
          }
          const fromToken = this.getTokenInfo(transfer, record.sourceToken);
          const toToken = this.getTokenInfo(toChain, record.targetToken);

          const responseHash = '';
          const result = RecordStatus.pending;
          const endTime = 0;
          await this.aggregationService.createHistoryRecord({
            id: this.genID(
              transfer,
              transfer.chainConfig.id.toString(),
              record.remoteChainId,
              record.id
            ),
            relayer: record.provider.toLowerCase(),
            fromChain: transfer.chainConfig.code,
            toChain: toChain.chainConfig.code,
            bridge: `lnv3`,
            messageNonce: record.messageNonce,
            nonce: latestNonce + 1,
            requestTxHash: record.transactionHash,
            sender: record.sender.toLowerCase(),
            recipient: record.receiver.toLowerCase(),
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
            sendTokenAddress: record.sourceToken.toLowerCase(),
            recvTokenAddress: record.targetToken.toLowerCase(),
            endTxHash: '',
            confirmedBlocks: '',
            needWithdrawLiquidity: !record.hasWithdrawn,
            lastRequestWithdraw: 0,
          });
          latestNonce += 1;
          size += 1;
        }
        if (size > 0) {
          this.logger.log(
            `lnv3 [${transfer.chainConfig.code}] save new send records succeeded nonce: ${latestNonce}, size: ${size}`
          );
        }

        this.fetchCache[index].latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(
        `lnv3 [${transfer.chainConfig.code}->] save new send record failed ${latestNonce}, ${error}`
      );
    }
  }

  // batch get status from target chain on sycing historical phase
  async queryFillInfos(transfer: PartnerT2, latestTimestamp: number) {
    if (transfer.level0Indexer === Level0Indexer.ponder) {
      const url = this.transferService.ponderEndpoint;
      const query = `query { lnv3RelayRecords(limit: 50, orderBy: "timestamp", orderDirection: "asc", where: {localChainId: "${transfer.chainConfig.id}", slashed: false, timestamp_gt: "${latestTimestamp}"}) { items { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }}`;
      return await axios
        .post(url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3RelayRecords.items);
    } else {
      const url = transfer.indexerUrl;
      const query = `query { lnv3RelayRecords(first: 20, orderBy: timestamp, orderDirection: asc, where: {timestamp_gt: "${latestTimestamp}", slashed: false}) { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }`;
      return await axios
        .post(url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv3RelayRecords);
    }
  }

  async batchFetchStatus(transfer: PartnerT2, index: number) {
    try {
      let latestTimestamp = this.fetchCache[index].latestFillInfoTimestamp;
      // stop sync history when timestamp set to zero
      if (latestTimestamp === 0) {
        return;
      } else if (latestTimestamp === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            toChain: transfer.chainConfig.code,
            bridge: `lnv3`,
          },
          { nonce: 'desc' }
        );
        latestTimestamp = firstRecord ? firstRecord.endTime : -1;
      }
      const relayRecords = await this.queryFillInfos(transfer, latestTimestamp);
      if (relayRecords.length === 0) {
        this.fetchCache[index].latestFillInfoTimestamp = 0;
        this.logger.log(`the batch sync end, chain: ${transfer.chainConfig.code}`);
        return;
      }
      let size = 0;
      for (const relayRecord of relayRecords) {
        // ignore slashed transfer
        if (relayRecord.slashed) continue;
        let rmvedTransferId = relayRecord.id;
        if (rmvedTransferId.startsWith(`${transfer.chainConfig.id}-`)) {
          rmvedTransferId = rmvedTransferId.replace(`${transfer.chainConfig.id}-`, '');
        }
        const uncheckedRecord = await this.aggregationService.queryHistoryRecordFirst({
          id: {
            endsWith: rmvedTransferId,
          },
        });
        // the record exist but not finished
        if (uncheckedRecord?.endTxHash === '') {
          const updateData = {
            result: RecordStatus.success,
            responseTxHash: relayRecord.transactionHash,
            endTxHash: relayRecord.transactionHash,
            endTime: Number(relayRecord.timestamp),
            relayer: relayRecord.relayer.toLowerCase(),
            needWithdrawLiquidity: false,
            lastRequestWithdraw: Number(relayRecord.requestWithdrawTimestamp),
          };

          await this.aggregationService.updateHistoryRecord({
            where: { id: uncheckedRecord.id },
            data: updateData,
          });
          this.fetchCache[index].latestFillInfoTimestamp = updateData.endTime;
          size += 1;
        } else if (uncheckedRecord) {
          this.fetchCache[index].latestFillInfoTimestamp = Number(relayRecord.timestamp);
        }
      }
      if (size > 0) {
        this.logger.log(`lnv3 [${transfer.chainConfig.code}] batch fetch status, size: ${size}`);
      }
    } catch (error) {
      this.logger.warn(`batch fetch lnv3 status failed, error ${error}`);
    }
  }

  async fetchStatus(transfer: PartnerT2, index: number) {
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip[index],
          take: this.takeEachTime,
          where: {
            fromChain: transfer.chainConfig.code,
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

      let size = 0;
      for (const record of uncheckedRecords) {
        const recordSplitted = record.id.split('-');
        const transferId = last(recordSplitted);
        const dstChainId = recordSplitted[2];

        if (record.endTxHash === '') {
          const toChain = this.getDestChain(dstChainId);
          const relayRecord = await this.queryRecordRelayStatus(toChain, transferId);

          if (relayRecord) {
            let needWithdrawLiquidity = record.needWithdrawLiquidity;
            const requestWithdrawTimestamp = Number(relayRecord.requestWithdrawTimestamp);
            let endTxHash = record.endTxHash;
            if (record.result !== RecordStatus.success) {
              const providerId = this.genRelayInfoID(
                transfer.chainConfig.id,
                toChain.chainConfig.id,
                record.relayer,
                record.sendTokenAddress
              );
              const relayerInfo = await this.aggregationService.queryLnBridgeRelayInfoById({
                id: providerId,
              });
              // waiting for relayer info update
              if (!relayerInfo) {
                this.logger.log(
                  `lnv3 [${transfer.chainConfig.code}->${toChain.chainConfig.code}] waiting for relayer info update, id: ${providerId}`
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
                relayer: relayRecord.relayer.toLowerCase(),
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

              size += 1;
              //this.logger.log(
              //`lnv3 [${transfer.chain}->${toChain.chain}] new status id: ${record.id} relayed responseTxHash: ${relayRecord.transactionHash}`
              //);
            }
            // query withdrawLiquidity result
            if (needWithdrawLiquidity && requestWithdrawTimestamp > 0) {
              // query result on source
              const transferRecord = await this.queryRecordWithdrawStatus(transfer, transferId);
              if (
                transferRecord &&
                (transferRecord.hasWithdrawn ||
                  record.lastRequestWithdraw < requestWithdrawTimestamp)
              ) {
                await this.aggregationService.updateHistoryRecord({
                  where: { id: record.id },
                  data: {
                    needWithdrawLiquidity: !transferRecord.hasWithdrawn,
                    endTxHash: transferRecord.responseTxHash,
                    lastRequestWithdraw: requestWithdrawTimestamp,
                  },
                });
                this.logger.log(
                  `lnv3 [${transfer.chainConfig.code}->${toChain.chainConfig.code}] tx withdrawn id: ${record.id}, time: ${requestWithdrawTimestamp}, done: ${transferRecord.hasWithdrawn}`
                );
              }
            }
          }
        }
      }

      if (size > 0) {
        this.logger.log(`lnv3 [${transfer.chainConfig.code}] update record status, size: ${size}`);
      }
    } catch (error) {
      this.logger.warn(`fetch lnv3 status failed, error ${error}`);
    }
  }

  private genRelayInfoID(
    fromChainId: number | BigInt,
    toChainId: number | BigInt,
    provider: string,
    sourceToken: string
  ): string {
    return `lnv3-${fromChainId}-${toChainId}-${provider}-${sourceToken}`;
  }

  private getMessageChannel(transfer: PartnerT2, toChain: string): ChainMessager | null {
    return (
      transfer.chainConfig.couples.find(
        (couple) => couple.chain.code === toChain && couple.protocol.name === 'lnv3'
      )?.messager ?? null
    );
  }

  private getCouple(
    transfer: PartnerT2,
    toChain: string,
    fromTokenSymbol: string
  ): ChainCouple | null {
    return (
      transfer.chainConfig.couples.find(
        (couple) =>
          couple.chain.code === toChain &&
          couple.protocol.name === 'lnv3' &&
          couple.symbol.from === fromTokenSymbol
      ) ?? null
    );
  }

  async fetchProviderInfo(transfer: PartnerT2, index: number) {
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnBridgeRelayInfoFirst(
          {
            version: 'lnv3',
            fromChain: transfer.chainConfig.code,
            bridge: `lnv3`,
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const records = await this.queryProviderInfo(transfer, latestNonce);
      // maybe this query is archived and can't access
      if (records === undefined) {
        this.logger.warn(`query record failed, url: ${transfer.indexerUrl}`);
        return;
      }

      let size = 0;
      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(
          transfer.chainConfig.id,
          record.remoteChainId,
          record.provider.toLowerCase(),
          record.sourceToken.toLowerCase()
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
          const couple = this.getCouple(transfer, toChain.chainConfig.code, fromToken?.symbol);
          if (fromToken === null || couple === null) {
            latestNonce += 1;
            this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
            this.logger.warn(
              `cannot find fromToken or couple, couple ${couple}, fromToken ${fromToken?.symbol}, fromChain: ${transfer.chainConfig.code}, toChain: ${toChain.chainConfig.code}`
            );
            continue;
          }
          // if not exist create
          await this.aggregationService.createLnBridgeRelayInfo({
            id: id,
            version: 'lnv3',
            fromChain: transfer.chainConfig.code,
            toChain: toChain.chainConfig.code,
            bridge: `lnv3`,
            nonce: latestNonce + 1,
            relayer: record.provider.toLowerCase(),
            sendToken: record.sourceToken.toLowerCase(),
            tokenKey: couple.category,
            transactionHash: record.transactionHash,
            timestamp: Number(record.timestamp),
            margin: penalty,
            protocolFee: BigInt(couple.fee).toString(),
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
            softTransferLimit: '0',
            paused: record.paused ?? false,
            messageChannel: couple.messager.name,
          });
          size += 1;
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
        size += 1;
        this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
      }
      if (size > 0) {
        this.logger.log(`lnv3 [${transfer.chainConfig.code}] update relayer info, size: ${size}`);
      }
    } catch (error) {
      this.logger.warn(`fetch lnv3bridge relayer records failed, error ${error}`);
    }
  }
}
