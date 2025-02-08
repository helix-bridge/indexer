import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { TransferService } from './transfer.service';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import {
  PartnerT3,
  RecordStatus,
  FetchCacheInfo,
  BridgeBaseConfigure,
} from '../base/TransferServiceT3';

export enum RelayUpdateType {
  PROVIDER_UPDATE,
  SLASH,
  WITHDRAW,
}

export interface FetchCacheRelayInfo extends FetchCacheInfo {
  confirmedNonce: string;
  latestRelayerInfoNonce: number;
  latestRelayerInfoTargetNonce: number;
  latestFillInfoTimestamp: number;
}

export interface BridgeIndexInfo {
  bridgeType: string;
  url: string;
  index: number;
}

export interface TokenPairInfo {
  key: string;
  fromSymbol: string;
  toSymbol: string;
  fromDecimals: number;
  toDecimals: number;
  channel: string;
  protocolFee: number;
}

@Injectable()
export class Lnv2Service implements OnModuleInit {
  private readonly logger = new Logger('lnv2');
  private readonly reorgTime = 900;
  baseConfigure: BridgeBaseConfigure = {
    name: 'lnBridgeV2',
    fetchHistoryDataFirst: 10,
    fetchSendDataInterval: 10000,
    takeEachTime: 2,
  };

  // default cache, opposite cache
  fetchCache: FetchCacheRelayInfo[] = new Array(this.transferService.transfers.length * 2)
    .fill('')
    .map((_) => ({
      latestNonce: -1,
      confirmedNonce: '0',
      latestRelayerInfoNonce: -1,
      latestRelayerInfoTargetNonce: -1,
      latestFillInfoTimestamp: -1,
      isSyncingHistory: false,
      skip: 0,
    }));

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  protected genID(bridgeType: string, transferId: string): string {
    return `lnv2-${bridgeType}-${transferId}`;
  }

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      if (item.defaultEndpoint !== null) {
        this.taskService.addInterval(
          `${this.baseConfigure.name}-${item.chainConfig.code}-default`,
          this.baseConfigure.fetchSendDataInterval,
          async () => {
            const indexInfo: BridgeIndexInfo = {
              bridgeType: 'default',
              url: item.defaultEndpoint,
              index: 2 * index,
            };
            this.schedule(item, indexInfo);
            return false;
          }
        );
      }
      if (item.oppositeEndpoint !== null) {
        this.taskService.addInterval(
          `${this.baseConfigure.name}-${item.chainConfig.code}-opposite`,
          this.baseConfigure.fetchSendDataInterval,
          async () => {
            const indexInfo: BridgeIndexInfo = {
              bridgeType: 'opposite',
              url: item.oppositeEndpoint,
              index: 2 * index + 1,
            };
            this.schedule(item, indexInfo);
            return false;
          }
        );
      }
    });
  }

  protected async schedule(item: PartnerT3, indexInfo: BridgeIndexInfo) {
    const index = indexInfo.index;
    if (this.fetchCache[index].isSyncingHistory) {
      return;
    }
    this.fetchCache[index].isSyncingHistory = true;
    if (indexInfo.bridgeType === 'opposite') {
      await this.fetchRelayInfo(item, indexInfo);
    } else {
      await this.fetchFeeInfoFromSource(item, indexInfo);
      await this.fetchMarginInfoFromTarget(item, indexInfo);
    }
    await this.repairReorg(item, indexInfo);
    // from source chain
    await this.fetchRecords(item, indexInfo);
    await this.batchFetchStatus(item, indexInfo);
    // from target chain
    await this.fetchStatus(item, indexInfo);
    this.fetchCache[index].isSyncingHistory = false;
  }

  private bridgeName(indexInfo: BridgeIndexInfo): string {
    return 'lnv2-' + indexInfo.bridgeType;
  }

  private formatSortedMessageNonce(nonce: number): string {
    return (100000000 + nonce).toString();
  }

  async updateLastTransferId(
    transfer: PartnerT3,
    indexInfo: BridgeIndexInfo,
    toChain: string,
    toChainId: number
  ) {
    // query the last transfer
    const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
      {
        fromChain: transfer.chainConfig.code,
        toChain: toChain,
        bridge: this.bridgeName(indexInfo),
      },
      { nonce: 'desc' }
    );
    const providerId = this.genRelayInfoID(
      Number(transfer.chainConfig.id),
      toChainId,
      firstRecord.relayer,
      firstRecord.sendTokenAddress
    );
    const recordSplitted = firstRecord.id.split('-');
    const transferId = last(recordSplitted);
    await this.aggregationService.updateLnBridgeRelayInfo({
      where: { id: providerId },
      data: { lastTransferId: transferId },
    });
  }

  // pending long time and not refreshed
  async repairReorg(transfer: PartnerT3, indexInfo: BridgeIndexInfo) {
    // query the first pending tx
    const firstPendingRecord = await this.aggregationService.queryHistoryRecordFirst(
      {
        AND: {
          fromChain: transfer.chainConfig.code,
          bridge: this.bridgeName(indexInfo),
          result: RecordStatus.pending,
          messageNonce: { gt: this.fetchCache[indexInfo.index].confirmedNonce },
        },
      },
      { nonce: 'asc' }
    );
    // the same tx hash, but different id
    if (firstPendingRecord) {
      if (firstPendingRecord.startTime + this.reorgTime < Date.now() / 1000) {
        const query = `query { lnv2TransferRecords(where: {transactionHash: \"${firstPendingRecord.requestTxHash}\"}) { id, nonce, provider, sender, receiver, sourceToken, targetToken, amount, transactionHash, timestamp, fee } }`;

        const records = await axios
          .post(indexInfo.url, {
            query: query,
            variables: null,
          })
          .then((res) => res.data?.data?.lnv2TransferRecords)
          .catch((err) => {
            this.logger.warn(`repair:query transfer records failed err ${err}`);
          });

        if (records && records.length == 1) {
          const record = records[0];
          const newId = this.genID(indexInfo.bridgeType, record.id);
          if (newId === firstPendingRecord.id) {
            return;
          }
          this.logger.log(
            `tx reorged, from ${transfer.chainConfig.id}, to ${record.remoteChainId}, txHash ${record.transactionHash}, oldId ${firstPendingRecord.id}, newId ${newId}`
          );
          // delete reorged tx
          await this.aggregationService.deleteHistoryRecord({
            id: firstPendingRecord.id,
          });
          this.fetchCache[indexInfo.index].confirmedNonce = this.formatSortedMessageNonce(
            Number(firstPendingRecord.nonce)
          );
          const toPartner = this.findPartnerByChainId(record.remoteChainId);

          // add correct tx
          await this.aggregationService.createHistoryRecord({
            id: this.genID(indexInfo.bridgeType, record.id),
            relayer: record.provider.toLowerCase(),
            fromChain: transfer.chainConfig.code,
            toChain: toPartner.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
            messageNonce: this.formatSortedMessageNonce(Number(record.nonce)),
            nonce: firstPendingRecord.nonce,
            requestTxHash: record.transactionHash,
            sender: record.sender.toLowerCase(),
            recipient: record.receiver.toLowerCase(),
            sendToken: firstPendingRecord.sendToken,
            recvToken: firstPendingRecord.recvToken,
            sendAmount: firstPendingRecord.sendAmount,
            recvAmount: firstPendingRecord.recvAmount,
            startTime: Number(record.timestamp),
            endTime: 0,
            result: 0,
            fee: record.fee,
            feeToken: firstPendingRecord.feeToken,
            responseTxHash: '',
            reason: '',
            sendTokenAddress: record.sourceToken.toLowerCase(),
            recvTokenAddress: firstPendingRecord.recvTokenAddress.toLowerCase(),
            endTxHash: '',
            confirmedBlocks: '',
          });
          // update last id
          await this.updateLastTransferId(
            transfer,
            indexInfo,
            toPartner.chainConfig.code,
            Number(toPartner.chainConfig.id)
          );
        }
      }
    }
  }

  // fetch records from src chain
  // 1. tx sent but not slash, save and use it as slash params, fetch status from target chain
  // 2. tx sent and slashed, save it directly, don't fetch status from target chain
  async fetchRecords(transfer: PartnerT3, indexInfo: BridgeIndexInfo) {
    const index = indexInfo.index;
    // the nonce of cBridge message is not increased
    let latestNonce = this.fetchCache[index].latestNonce;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            fromChain: transfer.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2TransferRecords(first: 30, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}, where: {localChainId: ${transfer.chainConfig.id}}) { id, remoteChainId, nonce, provider, sender, receiver, sourceToken, targetToken, amount, transactionHash, timestamp, fee } }`;

      const records = await axios
        .post(indexInfo.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2TransferRecords)
        .catch((err) => {
          this.logger.warn(`query transfer records failed err ${err}`);
        });
      let ignored = 0;
      if (records && records.length > 0) {
        for (const record of records) {
          const tokenPair = this.findTokenPair(
            transfer,
            record.sourceToken,
            record.remoteChainId,
            record.targetToken,
            indexInfo.bridgeType
          );
          if (tokenPair === null) {
            // add nonce to skip this record
            latestNonce += 1;
            ignored += 1;
            continue;
          }

          const toPartner = this.findPartnerByChainId(record.remoteChainId);

          const decimalsDiff = tokenPair.fromDecimals - tokenPair.toDecimals;
          const sendAmount =
            decimalsDiff > 0
              ? BigInt(record.amount) * BigInt(10 ** decimalsDiff)
              : BigInt(record.amount) / BigInt(10 ** -decimalsDiff);

          await this.aggregationService.createHistoryRecord({
            id: this.genID(indexInfo.bridgeType, record.id),
            relayer: record.provider.toLowerCase(),
            fromChain: transfer.chainConfig.code,
            toChain: toPartner.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
            messageNonce: this.formatSortedMessageNonce(Number(record.nonce)),
            nonce: latestNonce + 1,
            requestTxHash: record.transactionHash,
            sender: record.sender.toLowerCase(),
            recipient: record.receiver.toLowerCase(),
            sendToken: tokenPair.fromSymbol,
            recvToken: tokenPair.toSymbol,
            sendAmount: sendAmount.toString(),
            recvAmount: record.amount,
            startTime: Number(record.timestamp),
            endTime: 0,
            result: RecordStatus.pending,
            fee: record.fee,
            feeToken: tokenPair.fromSymbol,
            responseTxHash: '',
            reason: '',
            sendTokenAddress: record.sourceToken.toLowerCase(),
            recvTokenAddress: record.targetToken.toLowerCase(),
            endTxHash: '',
            confirmedBlocks: '',
          });
          const providerId = this.genRelayInfoID(
            Number(transfer.chainConfig.id),
            record.remoteChainId,
            record.provider,
            record.sourceToken
          );
          await this.aggregationService.updateLnBridgeRelayInfo({
            where: { id: providerId },
            data: { lastTransferId: record.id },
          });
          latestNonce += 1;
        }
        if (records && records.length > 0) {
          this.logger.log(
            `lnv2 new records, from ${
              transfer.chainConfig.id
            }, latest nonce ${latestNonce}, added ${records.length - ignored}, ignored ${ignored}`
          );
        }
        this.fetchCache[index].latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(`lnv2 fetch record failed, from ${transfer.chainConfig.id}, ${error}`);
    }
  }

  // batch get status from target chain on sycing historical phase
  async queryFillInfos(localChainId: number, indexInfo: BridgeIndexInfo, latestTimestamp: number) {
    const url = indexInfo.url;
    const query = `query { lnv2RelayRecords(first: 30, orderBy: timestamp, orderDirection: asc, where: {localChainId: ${localChainId}, timestamp_gt: ${latestTimestamp}, slasher: null}) { id, timestamp, transactionHash, fee } }`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv2RelayRecords);
  }

  async batchFetchStatus(transfer: PartnerT3, indexInfo: BridgeIndexInfo) {
    try {
      let latestTimestamp = this.fetchCache[indexInfo.index].latestFillInfoTimestamp;
      // stop sync history when timestamp set to zero
      if (latestTimestamp === 0) {
        return;
      } else if (latestTimestamp === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            toChain: transfer.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
            result: RecordStatus.success,
          },
          { nonce: 'desc' }
        );
        latestTimestamp = firstRecord ? firstRecord.endTime : -1;
      }
      const relayRecords = await this.queryFillInfos(
        Number(transfer.chainConfig.id),
        indexInfo,
        latestTimestamp
      );
      if (relayRecords.length === 0) {
        this.fetchCache[indexInfo.index].latestFillInfoTimestamp = 0;
        this.logger.log(
          `lnv2 the batch sync end, chain: ${transfer.chainConfig.code}, lastTime: ${latestTimestamp}`
        );
        return;
      }
      let batchAddCount = 0;
      for (const relayRecord of relayRecords) {
        // ignore slashed transfer
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
          };

          await this.aggregationService.updateHistoryRecord({
            where: { id: uncheckedRecord.id },
            data: updateData,
          });
          this.fetchCache[indexInfo.index].latestFillInfoTimestamp = updateData.endTime;
          batchAddCount += 1;
        } else if (uncheckedRecord) {
          this.fetchCache[indexInfo.index].latestFillInfoTimestamp = Number(relayRecord.timestamp);
        }
      }
      if (batchAddCount > 0) {
        this.logger.log(
          `lnv2 [${transfer.chainConfig.code}] batch fetch status, count: ${batchAddCount}`
        );
      }
    } catch (error) {
      this.logger.warn(`batch fetch lnv2 status failed, error ${error}`);
    }
  }

  // fetch status from target chain and source chain(slash result)
  // 1. relayed, finished
  // 2. cancel inited, save timestamp to check if users can cancel tx or ln can relay msg
  // 3. cancel request sent, save status and fetch status from src chain
  async fetchStatus(transfer: PartnerT3, indexInfo: BridgeIndexInfo) {
    const index = indexInfo.index;
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.fetchCache[index].skip,
          take: this.baseConfigure.takeEachTime,
          where: {
            fromChain: transfer.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
            endTxHash: '',
          },
        })
        .then((result) => result.records);

      if (uncheckedRecords.length < this.baseConfigure.takeEachTime) {
        this.fetchCache[index].skip = 0;
      } else {
        this.fetchCache[index].skip += this.baseConfigure.takeEachTime;
      }

      for (const record of uncheckedRecords) {
        const recordSplitted = record.id.split('-');
        const transferId = last(recordSplitted);

        // query from dest chain to get status relayed/pendingToConfirmRefund/pending
        let txStatus = record.result;

        if (txStatus === RecordStatus.pending) {
          const toPartner = this.findPartnerByChainName(record.toChain);
          const query = `query { lnv2RelayRecord(id: "${transferId}") { id, timestamp, transactionHash, slasher, fee }}`;
          const toUrl =
            indexInfo.bridgeType === 'default'
              ? toPartner.defaultEndpoint
              : toPartner.oppositeEndpoint;
          const relayRecord = await axios
            .post(toUrl, {
              query: query,
              variables: null,
            })
            .then((res) => res.data?.data?.lnv2RelayRecord)
            .catch((err) => {
              this.logger.warn(`query relay record failed err ${err}`);
            });

          if (relayRecord) {
            txStatus = RecordStatus.success;
            const updateData = {
              result: RecordStatus.success,
              responseTxHash: relayRecord.transactionHash,
              endTxHash: relayRecord.transactionHash,
              endTime: Number(relayRecord.timestamp), // we use this time to check slash time
            };

            await this.aggregationService.updateHistoryRecord({
              where: { id: record.id },
              data: updateData,
            });

            const cost = relayRecord.slasher === null ? relayRecord.fee : 0;
            const profit = relayRecord.slasher === null ? record.fee : 0;
            // update cost & profit TODO: penalty
            const providerId = this.genRelayInfoID(
              Number(transfer.chainConfig.id),
              Number(toPartner.chainConfig.id),
              record.relayer,
              record.sendTokenAddress
            );
            const relayerInfo = await this.aggregationService.queryLnBridgeRelayInfoById({
              id: providerId,
            });
            await this.aggregationService.updateLnBridgeRelayInfo({
              where: { id: providerId },
              data: {
                cost: (BigInt(relayerInfo.cost) + BigInt(cost)).toString(),
                profit: (BigInt(relayerInfo.profit) + BigInt(profit)).toString(),
              },
            });

            this.logger.log(
              `[${record.fromChain}->${record.toChain}]lnv2 new status id: ${record.id} relayed responseTxHash: ${relayRecord.transactionHash}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(`fetch lnv2 status failed, error ${error}`);
    }
  }

  private genRelayInfoID(
    fromChainId: number,
    toChainId: number,
    provider: string,
    sourceToken: string
  ): string {
    return `lnv2-${fromChainId}-${toChainId}-${provider}-${sourceToken}`;
  }

  private findPartnerByChainId(chainId: number) {
    return (
      this.transferService.transfers.find((item) => Number(item.chainConfig.id) === chainId) ?? null
    );
  }

  private findPartnerByChainName(chainName: string) {
    return (
      this.transferService.transfers.find((item) => item.chainConfig.code === chainName) ?? null
    );
  }

  private findTokenPair(
    transfer: PartnerT3,
    sourceAddress: string,
    targetChainId: number,
    targetAddress: string,
    bridgeType: string
  ): TokenPairInfo | null {
    const sourceInfo =
      transfer.chainConfig.tokens.find(
        (item) => item.address.toLowerCase() === sourceAddress.toLowerCase()
      ) ?? null;
    if (sourceInfo === null) {
      this.logger.warn(`source info not find ${transfer.chainConfig.code}-${sourceAddress}`);
      return null;
    }
    const couple =
      transfer.chainConfig.couples.find(
        (item) =>
          Number(item.chain.id) === targetChainId &&
          item.symbol.from.toLowerCase() === sourceInfo.symbol.toLowerCase() &&
          item.protocol.name === `lnv2-${bridgeType}`
      ) ?? null;
    if (couple === null) {
      this.logger.warn(
        `[${bridgeType}] target info not find ${transfer.chainConfig.code}-${sourceAddress}->${targetChainId}-${targetAddress}`
      );
      return null;
    }
    // verify targetAddress
    const targetPartner = this.findPartnerByChainId(targetChainId);
    if (targetPartner === null) {
      this.logger.warn(
        `[${bridgeType}] targetPartner not find ${transfer.chainConfig.code}-${sourceAddress}->${targetChainId}-${targetAddress}`
      );
      return null;
    }
    const targetInfo =
      targetPartner.chainConfig.tokens.find(
        (item) => item.address.toLowerCase() === targetAddress.toLowerCase()
      ) ?? null;
    if (targetInfo?.symbol.toLowerCase() !== couple.symbol.to.toLowerCase()) {
      this.logger.warn(
        `[${bridgeType}] verify target token failed ${transfer.chainConfig.code}-${sourceAddress}->${targetChainId}-${targetAddress}, symbol ${targetInfo?.symbol}, couple-to ${couple.symbol.to}`
      );
      return null;
    }
    return {
      key: couple.category,
      fromSymbol: couple.symbol.from,
      fromDecimals: sourceInfo.decimals,
      toSymbol: couple.symbol.to,
      toDecimals: targetInfo.decimals,
      channel: couple.messager.name,
      protocolFee: Number(couple.fee),
    };
  }

  transferDecimals(value: string, decimals: number): string {
    if (decimals > 0) {
      return value.padEnd(value.length + decimals, '0');
    } else if (value.length + decimals > 0) {
      return value.substr(0, value.length + decimals);
    } else {
      return '0';
    }
  }

  async fetchMarginInfoFromTarget(transfer: PartnerT3, indexInfo: BridgeIndexInfo) {
    const index = indexInfo.index;
    let latestNonce = this.fetchCache[index].latestRelayerInfoTargetNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnBridgeRelayInfoFirst(
          {
            toChain: transfer.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
          },
          { targetNonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.targetNonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 30, orderBy: nonce, orderDirection: asc, where: {localChainId: ${transfer.chainConfig.id}, updateType_in: [${RelayUpdateType.SLASH}, ${RelayUpdateType.WITHDRAW}]}, skip: ${latestNonce}) { id, remoteChainId, provider, margin, updateType, withdrawNonce, transactionHash, timestamp, sourceToken, targetToken } }`;
      const records = await axios
        .post(indexInfo.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords)
        .catch((err) => {
          this.logger.warn(`query margin update failed err ${err}`);
        });

      if (records && records.length > 0) {
        const record = records[0];
        // query by relayer
        const id = this.genRelayInfoID(
          record.remoteChainId,
          Number(transfer.chainConfig.id),
          record.provider,
          record.sourceToken
        );
        const sourcePartner = this.findPartnerByChainId(record.remoteChainId);
        if (sourcePartner === null) {
          this.logger.warn(
            `can't find partner chain source:${transfer.chainConfig.id} remote:${record.remoteChainId}`
          );
          latestNonce += 1;
          this.fetchCache[index].latestRelayerInfoTargetNonce = latestNonce;
          return;
        }
        const tokenPair = this.findTokenPair(
          sourcePartner,
          record.sourceToken,
          Number(transfer.chainConfig.id),
          record.targetToken,
          indexInfo.bridgeType
        );
        if (tokenPair === null) {
          // add nonce to skip this record
          latestNonce += 1;
          this.fetchCache[index].latestRelayerInfoTargetNonce = latestNonce;
          return;
        }
        const relayerInfo = await this.aggregationService.queryLnBridgeRelayInfoById({
          id: id,
        });
        const sourceMargin = this.transferDecimals(
          record.margin,
          tokenPair.fromDecimals - tokenPair.toDecimals
        );
        if (relayerInfo) {
          // transfer target margin to source margin
          const updateData = {
            margin: BigInt(sourceMargin).toString(),
            slashCount: relayerInfo.slashCount,
            withdrawNonce: relayerInfo.withdrawNonce,
            targetNonce: latestNonce + 1,
          };
          if (record.updateType == RelayUpdateType.SLASH) {
            updateData.slashCount = relayerInfo.slashCount + 1;
          } else if (record.updateType == RelayUpdateType.WITHDRAW) {
            updateData.withdrawNonce = Number(record.withdrawNonce);
            if (updateData.withdrawNonce < relayerInfo.withdrawNonce) {
              updateData.withdrawNonce = relayerInfo.withdrawNonce;
            }
          }
          await this.aggregationService.updateLnBridgeRelayInfo({
            where: { id: id },
            data: updateData,
          });
        } else {
          await this.aggregationService.createLnBridgeRelayInfo({
            id: id,
            version: 'lnv2',
            fromChain: sourcePartner.chainConfig.code,
            toChain: transfer.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
            nonce: 0,
            withdrawNonce: Number(record.withdrawNonce),
            relayer: record.provider.toLowerCase(),
            sendToken: record.sourceToken.toLowerCase(),
            recvToken: record.targetToken.toLowerCase(),
            tokenKey: tokenPair.key,
            transactionHash: record.transactionHash,
            timestamp: Number(record.timestamp),
            margin: BigInt(sourceMargin).toString(),
            protocolFee: BigInt(tokenPair.protocolFee).toString(),
            baseFee: '0',
            liquidityFeeRate: 0,
            slashCount: record.updateType == RelayUpdateType.SLASH ? 1 : 0,
            targetNonce: latestNonce + 1,
            cost: '0',
            profit: '0',
            heartbeatTimestamp: 0,
            lastTransferId: '0x0000000000000000000000000000000000000000000000000000000000000000',
            messageChannel: tokenPair.channel,
            transferLimit: '0',
            softTransferLimit: '0',
            paused: false,
          });
        }
        latestNonce += 1;
        this.fetchCache[index].latestRelayerInfoTargetNonce = latestNonce;
        this.logger.log(
          `update lnv2 relay margin, id ${id}, margin ${record.margin}, withdrawNonce ${record.withdrawNonce}, nonce ${latestNonce}, type ${record.updateType}`
        );
      }
    } catch (error) {
      this.logger.warn(`fetchMarginInfoFromTarget failed, error ${error}`);
    }
  }

  async fetchFeeInfoFromSource(transfer: PartnerT3, indexInfo: BridgeIndexInfo) {
    const index = indexInfo.index;
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnBridgeRelayInfoFirst(
          {
            fromChain: transfer.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 30, orderBy: nonce, orderDirection: asc, where: {localChainId: ${transfer.chainConfig.id}, updateType: ${RelayUpdateType.PROVIDER_UPDATE}}, skip: ${latestNonce}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, baseFee, liquidityFeeRate } }`;

      const records = await axios
        .post(indexInfo.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords)
        .catch((err) => {
          this.logger.warn(`query fee update failed err ${err}`);
        });

      if (records === undefined) {
        this.logger.warn(`query record failed, url: ${indexInfo.url}, query: ${query}`);
        return;
      }
      let size = 0;
      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(
          Number(transfer.chainConfig.id),
          record.remoteChainId,
          record.provider,
          record.sourceToken
        );
        const relayerInfo = await this.aggregationService.queryLnBridgeRelayInfoById({
          id: id,
        });
        const tokenPair = this.findTokenPair(
          transfer,
          record.sourceToken,
          record.remoteChainId,
          record.targetToken,
          indexInfo.bridgeType
        );
        if (tokenPair === null) {
          // add nonce to skip this record
          latestNonce += 1;
          this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
          continue;
        }
        const toPartner = this.findPartnerByChainId(record.remoteChainId);
        if (!relayerInfo) {
          // if not exist create
          await this.aggregationService.createLnBridgeRelayInfo({
            id: id,
            version: 'lnv2',
            fromChain: transfer.chainConfig.code,
            toChain: toPartner.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
            nonce: latestNonce + 1,
            withdrawNonce: 0,
            relayer: record.provider.toLowerCase(),
            sendToken: record.sourceToken.toLowerCase(),
            recvToken: record.targetToken.toLowerCase(),
            tokenKey: tokenPair.key,
            transactionHash: record.transactionHash,
            timestamp: Number(record.timestamp),
            margin: '0',
            protocolFee: BigInt(tokenPair.protocolFee).toString(),
            baseFee: BigInt(record.baseFee).toString(),
            liquidityFeeRate: Number(record.liquidityFeeRate),
            slashCount: 0,
            targetNonce: 0,
            cost: '0',
            profit: '0',
            heartbeatTimestamp: 0,
            lastTransferId: '0x0000000000000000000000000000000000000000000000000000000000000000',
            messageChannel: tokenPair.channel,
            transferLimit: '0',
            softTransferLimit: '0',
            paused: false,
          });
        } else {
          // else update
          const updateData = {
            timestamp: Number(record.timestamp),
            nonce: latestNonce + 1,
            baseFee: BigInt(relayerInfo.baseFee).toString(),
            liquidityFeeRate: relayerInfo.liquidityFeeRate,
          };
          updateData.baseFee = BigInt(record.baseFee).toString();
          updateData.liquidityFeeRate = Number(record.liquidityFeeRate);
          await this.aggregationService.updateLnBridgeRelayInfo({
            where: { id: id },
            data: updateData,
          });
        }
        latestNonce += 1;
        this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
        size += 1;
      }
      if (size > 0) {
        this.logger.log(`update lnv2 relay info from source, size: ${size}`);
      }
    } catch (error) {
      this.logger.warn(`fetchFeeInfoFromSource failed, error ${error}`);
    }
  }

  async fetchRelayInfo(transfer: PartnerT3, indexInfo: BridgeIndexInfo) {
    //const { chain: fromChain, symbols } = transfer;
    const index = indexInfo.index;
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnBridgeRelayInfoFirst(
          {
            fromChain: transfer.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 30, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}, where: {localChainId: ${transfer.chainConfig.id}}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, margin, baseFee, liquidityFeeRate } }`;

      const records = await axios
        .post(indexInfo.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords)
        .catch((err) => {
          this.logger.warn(`query relay update record failed err ${err}`);
        });

      if (records === undefined) {
        this.logger.warn(`query record failed, url: ${indexInfo.url}, query: ${query}`);
        return;
      }
      let size = 0;
      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(
          Number(transfer.chainConfig.id),
          record.remoteChainId,
          record.provider,
          record.sourceToken
        );
        const relayerInfo = await this.aggregationService.queryLnBridgeRelayInfoById({
          id: id,
        });
        const tokenPair = this.findTokenPair(
          transfer,
          record.sourceToken,
          record.remoteChainId,
          record.targetToken,
          indexInfo.bridgeType
        );
        if (tokenPair === null) {
          // add nonce to skip this record
          latestNonce += 1;
          continue;
        }
        const toPartner = this.findPartnerByChainId(record.remoteChainId);
        if (!relayerInfo) {
          // if not exist create
          const margin = record.margin === null ? '0' : record.margin;
          await this.aggregationService.createLnBridgeRelayInfo({
            id: id,
            version: 'lnv2',
            fromChain: transfer.chainConfig.code,
            toChain: toPartner.chainConfig.code,
            bridge: this.bridgeName(indexInfo),
            nonce: latestNonce,
            relayer: record.provider.toLowerCase(),
            sendToken: record.sourceToken.toLowerCase(),
            recvToken: record.targetToken.toLowerCase(),
            tokenKey: tokenPair.key,
            transactionHash: record.transactionHash,
            timestamp: Number(record.timestamp),
            margin: margin,
            protocolFee: BigInt(tokenPair.protocolFee).toString(),
            baseFee: BigInt(record.baseFee).toString(),
            liquidityFeeRate: Number(record.liquidityFeeRate),
            slashCount: 0,
            withdrawNonce: 0,
            targetNonce: 0,
            lastTransferId: '0x0000000000000000000000000000000000000000000000000000000000000000',
            cost: '0',
            profit: '0',
            heartbeatTimestamp: 0,
            messageChannel: tokenPair.channel,
            transferLimit: '0',
            softTransferLimit: '0',
            paused: false,
          });
        } else {
          // else update
          const updateData = {
            timestamp: Number(record.timestamp),
            nonce: latestNonce + 1,
            margin: relayerInfo.margin,
            baseFee: BigInt(relayerInfo.baseFee).toString(),
            liquidityFeeRate: relayerInfo.liquidityFeeRate,
            slashCount: relayerInfo.slashCount,
          };
          if (record.updateType == RelayUpdateType.PROVIDER_UPDATE) {
            updateData.margin = record.margin;
            updateData.baseFee = BigInt(record.baseFee).toString();
            updateData.liquidityFeeRate = Number(record.liquidityFeeRate);
          } else if (record.updateType == RelayUpdateType.WITHDRAW) {
            updateData.margin = record.margin;
          } else if (record.updateType == RelayUpdateType.SLASH) {
            updateData.margin = record.margin;
            updateData.slashCount = relayerInfo.slashCount + 1;
          }
          await this.aggregationService.updateLnBridgeRelayInfo({
            where: { id: id },
            data: updateData,
          });
        }
        latestNonce += 1;
        this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
        size += 1;
      }
      if (size > 0) {
        this.logger.log(`update lnv2 relay info for opposite, size ${size}`);
      }
    } catch (error) {
      this.logger.warn(`fetchRelayInfo failed, error ${error}`);
    }
  }
}
