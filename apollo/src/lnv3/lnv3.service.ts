import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2, RecordStatus, Level0IndexerType } from '../base/TransferServiceT2';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { ChainToken, ChainMessager, ChainCouple } from '@helixbridge/helixconf';
import { Lnv3Record, Lnv3RelayRecord } from './source/source.service';
import { Lnv3ThegraphService } from './source/thegraph.service';
import { Lnv3PonderService } from './source/ponder.service';
import { Lnv3EnvioService } from './source/envio.service';
import { Lnv3SuperService } from './source/super.service';

export enum RelayUpdateType {
  PROVIDER_UPDATE,
  PAUSE_UPDATE,
}

interface SkipInfo {
  fromChain: string;
  toChain: string;
  skip: number;
}

interface Lnv3RecordInfo {
  lv0Type: Level0IndexerType;
  cursor: bigint;
  records: Lnv3Record[];
}

interface Lnv3RelayInfo {
  lv0Type: Level0IndexerType;
  cursor: bigint;
  records: Lnv3RelayRecord[];
}

enum SyncStage {
  SyncRecord,
  SyncStatus,
  SyncFinished,
}

@Injectable()
export class Lnv3Service implements OnModuleInit {
  private readonly logger = new Logger('lnv3');

  private fetchCache = new Array(this.transferService.transfers.length).fill('').map((_) => ({
    latestRelayerInfoNonce: -1,
    isSyncingHistory: false,
    waitingWithdrawRecords: [],
    fetchProviderInfoInterval: 0,
    syncingStage: SyncStage.SyncRecord,
  }));

  protected fetchSendDataInterval = 5000;

  private readonly takeEachTime = 2;
  private skip: SkipInfo[] = [];
  private skipForWithdrawLiquidity = new Array(this.transferService.transfers.length).fill(0);
  private sourceServices = new Map();

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
    this.sourceServices.set(Level0IndexerType.thegraph, new Lnv3ThegraphService());
    this.sourceServices.set(Level0IndexerType.ponder, new Lnv3PonderService());
    this.sourceServices.set(Level0IndexerType.envio, new Lnv3EnvioService());
    this.sourceServices.set(Level0IndexerType.superindex, new Lnv3SuperService());
  }

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.fetchCache[index].fetchProviderInfoInterval = index;
      this.taskService.addInterval(
        `${item.chainConfig.code}-lnv3-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
          if (this.fetchCache[index].isSyncingHistory) {
            return true;
          }
          this.fetchCache[index].isSyncingHistory = true;
          await this.fetchProviderInfo(item, index);
          await this.fetchRecords(item, index);
          await this.batchFetchStatus(item, index);
          await this.fetchStatuses(item, index);
          await this.fetchWithdrawCacheStatus(item, index);
          this.fetchCache[index].isSyncingHistory = false;
          return false;
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
      return `${
        transfer.chainConfig.code.split('-')[0]
      }-${fromChainId}-${toChainId}-lnv3-${rmvedChainId}`;
    } else {
      return `${
        transfer.chainConfig.code.split('-')[0]
      }-${fromChainId}-${toChainId}-lnv3-${transferId}`;
    }
  }

  lv0TransferRecordCursorId(chainId: bigint, indexerType: Level0IndexerType): string {
    return `lnv3-lv0-tr-${chainId}-${indexerType}`;
  }

  lv0RelayRecordCursorId(chainId: bigint, indexerType: Level0IndexerType): string {
    return `lnv3-lv0-rr-${chainId}-${indexerType}`;
  }

  async getLevel0TransferRecordCursor(
    chainId: bigint,
    indexerType: Level0IndexerType
  ): Promise<bigint> {
    const id = this.lv0TransferRecordCursorId(chainId, indexerType);
    return await this.aggregationService.readCursor(id);
  }

  async getLevel0RelayRecordCursor(
    chainId: bigint,
    indexerType: Level0IndexerType
  ): Promise<bigint> {
    const id = this.lv0RelayRecordCursorId(chainId, indexerType);
    return await this.aggregationService.readCursor(id);
  }

  async queryRecordInfo(transfer: PartnerT2, limit: number): Promise<Lnv3RecordInfo[]> {
    let results = [];
    for (const level0Indexer of transfer.level0Indexers) {
      const service = this.sourceServices.get(level0Indexer.indexerType);
      try {
        const cursor = await this.getLevel0TransferRecordCursor(
          transfer.chainConfig.id,
          level0Indexer.indexerType
        );
        const response = await service.queryRecordInfo(
          level0Indexer.url,
          transfer.chainConfig.id,
          cursor,
          limit
        );
        if (response && response.length > 0) {
          results.push({
            lv0Type: level0Indexer.indexerType,
            cursor: cursor,
            records: response,
          });
        }
      } catch (err) {
        this.logger.warn(
          `try to get records failed, id ${transfer.chainConfig.id}, type ${level0Indexer.indexerType}, err ${err}`
        );
      }
    }
    return results;
  }

  async queryProviderInfo(transfer: PartnerT2, latestNonce: number) {
    let result = [];
    for (const level0Indexer of transfer.level0Indexers) {
      const service = this.sourceServices.get(level0Indexer.indexerType);
      try {
        const response = await service.queryProviderInfo(
          level0Indexer.url,
          transfer.chainConfig.id,
          latestNonce
        );
        if (response && response.length >= result.length) {
          result = response;
        }
      } catch (err) {
        this.logger.warn(
          `try to get provider infos failed, id ${transfer.chainConfig.id}, type ${level0Indexer.indexerType}, err ${err}`
        );
      }
    }
    return result;
  }

  async queryRecordRelayStatus(toChain: PartnerT2, transferId: string) {
    for (const level0Indexer of toChain.level0Indexers) {
      const service = this.sourceServices.get(level0Indexer.indexerType);
      try {
        const response = await service.queryRelayStatus(
          level0Indexer.url,
          toChain.chainConfig.id,
          transferId
        );
        if (response) {
          return response;
        }
      } catch (err) {
        this.logger.warn(
          `try to get relay status failed, id ${toChain.chainConfig.id}, type ${level0Indexer.indexerType}, transferId ${transferId} err ${err}`
        );
      }
    }
  }

  async queryMultiRecordRelayStatus(toChain: PartnerT2, transferIds: string[]) {
    for (const level0Indexer of toChain.level0Indexers) {
      const service = this.sourceServices.get(level0Indexer.indexerType);
      try {
        return (
          (await service.queryMultiRelayStatus(
            level0Indexer.url,
            toChain.chainConfig.id,
            transferIds
          )) ?? []
        );
      } catch (err) {
        this.logger.warn(
          `try to get multi relay status failed, id ${toChain.chainConfig.id}, type ${level0Indexer.indexerType}, transferIds ${transferIds} err ${err}`
        );
        return [];
      }
    }
  }

  async queryRecordWithdrawStatus(transfer: PartnerT2, transferId: string) {
    for (const level0Indexer of transfer.level0Indexers) {
      const service = this.sourceServices.get(level0Indexer.indexerType);
      try {
        const response = await service.queryWithdrawStatus(
          level0Indexer.url,
          transfer.chainConfig.id,
          transferId
        );
        if (response) {
          return response;
        }
      } catch (err) {
        this.logger.warn(
          `try to get withdraw status failed, id ${transfer.chainConfig.id}, type ${level0Indexer.indexerType}, err ${err}`
        );
      }
    }
  }

  async saveRecord(transfer: PartnerT2, recordInfo: Lnv3RecordInfo) {
    const records = recordInfo.records;
    let size = 0;
    let cursor = recordInfo.cursor;
    let lastTimestamp = '';
    for (const record of records) {
      cursor += BigInt(1);
      const toChain = this.getDestChain(record.remoteChainId.toString());
      if (toChain === null) {
        this.logger.warn(`fetch record cannot find toChain, id ${record.remoteChainId}`);
        continue;
      }
      const fromToken = this.getTokenInfo(transfer, record.sourceToken);
      const toToken = this.getTokenInfo(toChain, record.targetToken);
      if (fromToken === null) {
        this.logger.warn(
          `cannot find fromToken symbol, fromToken ${record.sourceToken}, chain: ${transfer.chainConfig.code}`
        );
        continue;
      }
      if (toToken === null) {
        this.logger.warn(
          `cannot find fromToken symbol, toToken ${record.targetToken}, chain: ${toChain.chainConfig.code}`
        );
        continue;
      }

      lastTimestamp = record.timestamp;
      const id = this.genID(
        transfer,
        transfer.chainConfig.id.toString(),
        record.remoteChainId.toString(),
        record.id
      );
      let createData = {
        id: id,
        relayer: record.provider.toLowerCase(),
        fromChain: transfer.chainConfig.code,
        toChain: toChain.chainConfig.code,
        bridge: `lnv3`,
        messageNonce: record.messageNonce,
        nonce: 0,
        requestTxHash: record.transactionHash,
        sender: record.sender.toLowerCase(),
        recipient: record.receiver.toLowerCase(),
        sendToken: fromToken.symbol,
        recvToken: toToken.symbol,
        sendAmount: record.sourceAmount,
        recvAmount: record.targetAmount,
        startTime: Number(record.timestamp),
        endTime: 0,
        result: RecordStatus.pending,
        fee: record.fee,
        feeToken: fromToken.symbol,
        responseTxHash: '',
        reason: '',
        sendTokenAddress: record.sourceToken.toLowerCase(),
        recvTokenAddress: record.targetToken.toLowerCase(),
        endTxHash: '',
        confirmedBlocks: '',
        needWithdrawLiquidity: !record.hasWithdrawn,
        lastRequestWithdraw: 0,
      };
      const updateData = record.hasWithdrawn ? { needWithdrawLiquidity: false } : {};
      await this.aggregationService.saveHistoryRecord({
        where: { id: id },
        dataCreate: createData,
        dataUpdate: updateData,
      });
      size += 1;
      const skip = this.skip.find(
        (s) => s.fromChain === transfer.chainConfig.code && s.toChain === toChain.chainConfig.code
      );
      if (!skip) {
        this.skip.push({
          fromChain: transfer.chainConfig.code,
          toChain: toChain.chainConfig.code,
          skip: 0,
        });
      }
      await this.aggregationService.writeCursor(
        this.lv0TransferRecordCursorId(transfer.chainConfig.id, recordInfo.lv0Type),
        cursor
      );
    }
    if (size > 0) {
      this.logger.log(
        `lnv3 [${transfer.chainConfig.code}] save new send records succeeded: ${Level0IndexerType[recordInfo.lv0Type]}-${cursor}-${lastTimestamp}, size: ${size}`
      );
    }
  }

  async saveRelayInfo(transfer: PartnerT2, relayInfo: Lnv3RelayInfo) {
    const records = relayInfo.records;
    let size = 0;
    let cursor = relayInfo.cursor;
    let lastTimestamp = '';
    for (const relayRecord of records) {
      cursor += BigInt(1);
      lastTimestamp = relayRecord.timestamp;
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
        const endTxHash = uncheckedRecord.needWithdrawLiquidity ? '' : relayRecord.transactionHash;
        const updateData = {
          result: RecordStatus.success,
          responseTxHash: relayRecord.transactionHash,
          endTxHash: endTxHash,
          endTime: Number(relayRecord.timestamp),
          relayer: relayRecord.relayer.toLowerCase(),
          lastRequestWithdraw: Number(relayRecord.requestWithdrawTimestamp),
        };

        await this.aggregationService.updateHistoryRecord({
          where: { id: uncheckedRecord.id },
          data: updateData,
        });
        size += 1;
      }
      await this.aggregationService.writeCursor(
        this.lv0RelayRecordCursorId(transfer.chainConfig.id, relayInfo.lv0Type),
        cursor
      );
    }
    if (records.length > 0) {
      this.logger.log(
        `lnv3 [${transfer.chainConfig.code}] save new relay records succeeded: ${Level0IndexerType[relayInfo.lv0Type]}-${cursor}-${lastTimestamp}, size: ${size}`
      );
    }
  }

  async fetchRecords(transfer: PartnerT2, index: number) {
    try {
      const cache = this.fetchCache[index];
      const limit = cache.syncingStage === SyncStage.SyncRecord ? 500 : 10;
      const recordList = await this.queryRecordInfo(transfer, limit);
      for (const recordInfo of recordList) {
        if (recordInfo.records && recordInfo.records.length > 0) {
          try {
            await this.saveRecord(transfer, recordInfo);
          } catch (error) {
            this.logger.warn(`save record failed, error ${error}`);
          }
        }
      }
      if (recordList.length === 0 && cache.syncingStage === SyncStage.SyncRecord) {
        this.logger.log(`lnv3 [${transfer.chainConfig.code}->] sync records finished`);
        cache.syncingStage = SyncStage.SyncStatus;
      }
    } catch (error) {
      this.logger.warn(
        `lnv3 [${transfer.chainConfig.code}->] save new send record failed ${error}`
      );
    }
  }

  // batch get status from target chain on sycing historical phase
  async queryFillInfos(transfer: PartnerT2, limit: number): Promise<Lnv3RelayInfo[]> {
    let results = [];
    for (const level0Indexer of transfer.level0Indexers) {
      const service = this.sourceServices.get(level0Indexer.indexerType);
      try {
        const cursor = await this.getLevel0RelayRecordCursor(
          transfer.chainConfig.id,
          level0Indexer.indexerType
        );
        const response = await service.batchQueryRelayStatus(
          level0Indexer.url,
          transfer.chainConfig.id,
          cursor,
          limit
        );
        if (response && response.length > 0) {
          results.push({
            lv0Type: level0Indexer.indexerType,
            cursor: cursor,
            records: response,
          });
        }
      } catch (err) {
        this.logger.warn(
          `try to batch get fill infos failed, id ${transfer.chainConfig.id}, type ${level0Indexer.indexerType}, err ${err}`
        );
      }
    }
    return results;
  }

  async batchFetchStatus(transfer: PartnerT2, index: number) {
    for (const cache of this.fetchCache) {
      if (cache.syncingStage === SyncStage.SyncRecord) {
        return;
      }
    }
    try {
      const cache = this.fetchCache[index];
      const limit = cache.syncingStage === SyncStage.SyncFinished ? 10 : 500;
      const relayList = await this.queryFillInfos(transfer, limit);
      let size = 0;
      for (const relayInfo of relayList) {
        if (relayInfo.records && relayInfo.records.length > 0) {
          await this.saveRelayInfo(transfer, relayInfo);
        }
      }

      if (relayList.length === 0 && cache.syncingStage !== SyncStage.SyncFinished) {
        this.logger.log(`lnv3 [${transfer.chainConfig.code}->] sync status finished`);
        cache.syncingStage = SyncStage.SyncFinished;
      }
    } catch (error) {
      this.logger.warn(`batch fetch lnv3 status failed, error ${error}`);
    }
  }

  async fetchWithdrawCacheStatus(transfer: PartnerT2, index: number) {
    const records = await this.aggregationService
      .queryHistoryRecords({
        skip: this.skipForWithdrawLiquidity[index],
        take: this.takeEachTime,
        where: {
          fromChain: transfer.chainConfig.code,
          bridge: `lnv3`,
          NOT: { result: RecordStatus.pending },
          needWithdrawLiquidity: true,
          endTxHash: '',
        },
      })
      .then((result) => result.records);

    if (records.length < this.takeEachTime) {
      this.skipForWithdrawLiquidity[index] = 0;
    } else {
      this.skipForWithdrawLiquidity[index] += this.takeEachTime;
    }

    const transferIdMap = new Map<string, string[]>();
    for (const record of records) {
      const recordSplitted = record.id.split('-');
      const transferId: string = last(recordSplitted);
      const chainId = recordSplitted[2];
      const transferIds = transferIdMap.get(chainId);
      if (!transferIds) {
        transferIdMap.set(chainId, [transferId]);
      } else {
        transferIds.push(transferId);
      }
    }
    for (const [chainId, transferIds] of transferIdMap) {
      const toChain = this.getDestChain(chainId);
      const relayRecords = await this.queryMultiRecordRelayStatus(toChain, transferIds);
      for (const relayRecord of relayRecords) {
        const requestWithdrawTimestamp = Number(relayRecord.requestWithdrawTimestamp);
        if (requestWithdrawTimestamp > 0) {
          const transferRecord = await this.queryRecordWithdrawStatus(transfer, relayRecord.id);
          if (transferRecord) {
            const id = this.genID(
              transfer,
              transfer.chainConfig.id.toString(),
              transferRecord.remoteChainId,
              transferRecord.id
            );
            await this.aggregationService.updateHistoryRecord({
              where: { id: id },
              data: {
                needWithdrawLiquidity: !transferRecord.hasWithdrawn,
                endTxHash: transferRecord.hasWithdrawn ? relayRecord.transactionHash : '',
                lastRequestWithdraw: requestWithdrawTimestamp,
              },
            });
          }
        }
      }
    }
  }

  async fetchStatuses(transfer: PartnerT2, index: number) {
    for (const cache of this.fetchCache) {
      if (cache.syncingStage !== SyncStage.SyncFinished) {
        return;
      }
    }
    const skips = this.skip.filter((s) => s.fromChain === transfer.chainConfig.code);
    for (const skip of skips) {
      await this.fetchStatus(transfer, index, skip);
    }
  }

  async fetchStatus(transfer: PartnerT2, index: number, skip: SkipInfo) {
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: skip.skip,
          take: this.takeEachTime,
          where: {
            fromChain: transfer.chainConfig.code,
            toChain: skip.toChain,
            bridge: `lnv3`,
            result: RecordStatus.pending,
            endTxHash: '',
          },
        })
        .then((result) => result.records);

      if (uncheckedRecords.length < this.takeEachTime) {
        skip.skip = 0;
      } else {
        skip.skip += this.takeEachTime;
      }

      let size = 0;
      for (const record of uncheckedRecords) {
        const recordSplitted = record.id.split('-');
        const transferId = last(recordSplitted);
        const dstChainId = recordSplitted[2];
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
            this.logger.log(
              `lnv3 [${transfer.chainConfig.code}->${toChain.chainConfig.code}] new status id: ${record.id} relayed responseTxHash: ${relayRecord.transactionHash}`
            );
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
    const cache = this.fetchCache[index];
    cache.fetchProviderInfoInterval += 1;
    if (cache.fetchProviderInfoInterval <= 5) {
      return;
    }
    cache.fetchProviderInfoInterval = 0;
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
        this.logger.warn(`query record failed, id: ${transfer.chainConfig.id}`);
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
