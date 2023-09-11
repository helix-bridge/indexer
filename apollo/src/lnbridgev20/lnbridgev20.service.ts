import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { TransferService } from './transfer.service';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import {
  PartnerT2,
  RecordStatus,
  FetchCacheInfo,
  BridgeBaseConfigure,
} from '../base/TransferServiceT2';

export enum RelayUpdateType {
  PROVIDER_UPDATE,
  SLASH,
  WITHDRAW,
}

export interface FetchCacheRelayInfo extends FetchCacheInfo {
  confirmedNonce: string;
  latestRelayerInfoNonce: number;
  latestRelayerInfoTargetNonce: number;
}

@Injectable()
export class Lnbridgev20Service implements OnModuleInit {
  private readonly logger = new Logger('lnbridgev2.0');
  private readonly reorgTime = 900;
  baseConfigure: BridgeBaseConfigure = {
    name: 'lnBridgeV20',
    fetchHistoryDataFirst: 10,
    fetchSendDataInterval: 3000,
    takeEachTime: 3,
  };

  fetchCache: FetchCacheRelayInfo[] = new Array(this.transferService.transfers.length)
    .fill('')
    .map((_) => ({
      latestNonce: -1,
      confirmedNonce: "0",
      latestRelayerInfoNonce: -1,
      latestRelayerInfoTargetNonce: -1,
      isSyncingHistory: false,
      skip: 0,
    }));

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

  protected genID(transfer: PartnerT2, transferId: string): string {
    return `lnbridgev20-${transfer.bridge}-${transferId}`;
  }

  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.taskService.addInterval(
        `${item.chain}-${this.baseConfigure.name}-${item.bridge}`,
        this.baseConfigure.fetchSendDataInterval,
        async () => {
          this.schedule(item, index);
        }
      );
    });
  }

  protected async schedule(item: PartnerT2, index: number) {
    if (this.fetchCache[index].isSyncingHistory) {
      return;
    }
    this.fetchCache[index].isSyncingHistory = true;
    if (item.bridge === 'opposite') {
        await this.fetchRelayInfo(item, index);
    } else {
        await this.fetchFeeInfoFromSource(item, index);
        await this.fetchMarginInfoFromTarget(item, index);
    }
    await this.repairReorg(item, index);
    // from source chain
    await this.fetchRecords(item, index);
    // from target chain
    await this.fetchStatus(item, index);
    this.fetchCache[index].isSyncingHistory = false;
  }

  private bridgeName(transfer: PartnerT2): string {
      return 'lnbridgev20-' + transfer.bridge;
  }

  private formatSortedMessageNonce(nonce: number): string {
      return (100000000 + nonce).toString();
  }

  async updateLastTransferId(transfer: PartnerT2, toChain: string, toChainId: number) {
      const { chain: fromChain } = transfer;
      // query the last transfer
      const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            fromChain: fromChain,
            toChain: toChain,
            bridge: this.bridgeName(transfer),
          },
          { nonce: 'desc' }
        );
      const providerId = this.genRelayInfoID(transfer.chainId, toChainId, firstRecord.relayer, firstRecord.sendTokenAddress);
      const recordSplitted = firstRecord.id.split('-');
      const transferId = last(recordSplitted);
      await this.aggregationService.updateLnv20RelayInfo({
          where: { id: providerId },
          data: {lastTransferId: transferId},
      });
  }

  // pending long time and not refreshed
  async repairReorg(transfer: PartnerT2, index: number) {
      const { chain: fromChain } = transfer;
      // query the first pending tx
      const firstPendingRecord = await this.aggregationService.queryHistoryRecordFirst(
        {
          AND: {
              fromChain: fromChain,
              bridge: this.bridgeName(transfer),
              result: RecordStatus.pending,
              messageNonce: { gt: this.fetchCache[index].confirmedNonce },
          },
        },
        { nonce: 'asc' }
      );
      // the same tx hash, but different id
      if (firstPendingRecord) {
          if (firstPendingRecord.startTime + this.reorgTime < Date.now() / 1000) {
              const query = `query { lnv2TransferRecords(where: {transactionHash: \"${firstPendingRecord.requestTxHash}\"}) { id, nonce, provider, sender, receiver, sourceToken, targetToken, amount, transactionHash, timestamp, fee } }`;

              const records = await axios
              .post(transfer.url, {
                  query: query,
                  variables: null,
              })
              .then((res) => res.data?.data?.lnv2TransferRecords)
              .catch((err) => {
                  this.logger.warn(`repair:query transfer records failed err ${err}`);
              });

              if (records && records.length == 1) {
                  const record = records[0];
                  const newId = this.genID(transfer, record.id);
                  if (newId === firstPendingRecord.id) {
                    return;
                  }
                  this.logger.log(
                      `tx reorged, from ${transfer.chainId}, to ${record.remoteChainId}, txHash ${record.transactionHash}, oldId ${firstPendingRecord.id}, newId ${newId}`
                  );
                  // delete reorged tx
                  await this.aggregationService.deleteHistoryRecord({
                      id: firstPendingRecord.id
                  });
                  this.fetchCache[index].confirmedNonce = this.formatSortedMessageNonce(Number(firstPendingRecord.nonce));
                  const toPartner = this.findPartnerByChainId(record.remoteChainId);

                  // add correct tx
                  await this.aggregationService.createHistoryRecord({
                      id: this.genID(transfer, record.id),
                      relayer: record.provider,
                      fromChain: fromChain,
                      toChain: toPartner.chain,
                      bridge: this.bridgeName(transfer),
                      messageNonce: this.formatSortedMessageNonce(Number(record.nonce)),
                      nonce: firstPendingRecord.nonce,
                      requestTxHash: record.transactionHash,
                      sender: record.sender,
                      recipient: record.receiver,
                      sendToken: firstPendingRecord.sendToken,
                      recvToken: firstPendingRecord.recvToken,
                      sendAmount: record.amount,
                      recvAmount: '0',
                      startTime: Number(record.timestamp),
                      endTime: 0,
                      result: 0,
                      fee: record.fee,
                      feeToken: firstPendingRecord.feeToken,
                      responseTxHash: '',
                      reason: '',
                      sendTokenAddress: record.sourceToken,
                      recvTokenAddress: firstPendingRecord.recvTokenAddress,
                      endTxHash: '',
                      confirmedBlocks: '',
                  });
                  // update last id
                  await this.updateLastTransferId(transfer, toPartner.chain, toPartner.chainId);
              }
          }
      }
  }

  // fetch records from src chain
  // 1. tx sent but not slash, save and use it as slash params, fetch status from target chain
  // 2. tx sent and slashed, save it directly, don't fetch status from target chain
  async fetchRecords(transfer: PartnerT2, index: number) {
    // the nonce of cBridge message is not increased
    let latestNonce = this.fetchCache[index].latestNonce;
    const { chain: fromChain, symbols } = transfer;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            fromChain: fromChain,
            bridge: this.bridgeName(transfer),
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2TransferRecords(first: 10, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}) { id, remoteChainId, nonce, provider, sender, receiver, sourceToken, targetToken, amount, transactionHash, timestamp, fee } }`;

      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2TransferRecords)
        .catch((err) => {
            this.logger.warn(`query transfer records failed err ${err}`);
        });
      if (records && records.length > 0) {
        for (const record of records) {
          const fromSymbol = symbols.find((item) => item.address.toLowerCase() === record.sourceToken) ?? null;
          if (!fromSymbol) {
            this.logger.warn(`cannot find from symbol, fromChain ${fromChain} address ${record.sourceToken}`);
            continue;
          }

          const fromToken = fromSymbol.symbol;
          const toPartner = this.findPartnerByChainId(record.remoteChainId);
          const toSymbol = toPartner.symbols.find((item) => item.address.toLowerCase() === record.targetToken) ?? null;
          if (!toSymbol) {
            this.logger.warn(`cannot find to symbol, toChain: ${toPartner.chain} address ${record.targetToken}`);
            continue;
          }
          const toToken = toSymbol.symbol;

          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.id),
            relayer: record.provider,
            fromChain: fromChain,
            toChain: toPartner.chain,
            bridge: this.bridgeName(transfer),
            messageNonce: this.formatSortedMessageNonce(Number(record.nonce)),
            nonce: latestNonce + 1,
            requestTxHash: record.transactionHash,
            sender: record.sender,
            recipient: record.receiver,
            sendToken: fromToken,
            recvToken: toToken,
            sendAmount: record.amount,
            recvAmount: '0',
            startTime: Number(record.timestamp),
            endTime: 0,
            result: RecordStatus.pending,
            fee: record.fee,
            feeToken: fromToken,
            responseTxHash: '',
            reason: '',
            sendTokenAddress: record.sourceToken,
            recvTokenAddress: record.targetToken,
            endTxHash: '',
            confirmedBlocks: '',
          });
          const providerId = this.genRelayInfoID(transfer.chainId, record.remoteChainId, record.provider, record.sourceToken);
          await this.aggregationService.updateLnv20RelayInfo({
            where: { id: providerId },
            data: {lastTransferId: record.id},
          });
          latestNonce += 1;
        }
        if (records && records.length > 0) {
          this.logger.log(
            `lnbridgev2 new records, from ${transfer.chainId}, latest nonce ${latestNonce}, added ${records.length}`
          );
        }
        this.fetchCache[index].latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(
        `lnbridgev2 fetch record failed, from ${transfer.chainId}, ${error}`
      );
    }
  }

  // fetch status from target chain and source chain(slash result)
  // 1. relayed, finished
  // 2. cancel inited, save timestamp to check if users can cancel tx or ln can relay msg
  // 3. cancel request sent, save status and fetch status from src chain
  async fetchStatus(transfer: PartnerT2, index: number) {
    const { chain: fromChain, bridge } = transfer;
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.fetchCache[index].skip,
          take: this.baseConfigure.takeEachTime,
          where: {
            fromChain: fromChain,
            bridge: this.bridgeName(transfer),
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
          const toPartner = this.findPartnerByChainName(record.toChain, bridge);
          const query = `query { lnv2RelayRecord(id: "${transferId}") { id, timestamp, transactionHash, slasher }}`;
          const relayRecord = await axios
            .post(toPartner.url, {
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
              recvAmount: record.sendAmount,
            };

            await this.aggregationService.updateHistoryRecord({
              where: { id: record.id },
              data: updateData,
            });

            this.logger.log(
              `[${record.fromChain}->${record.toChain}]lnv2bridge new status id: ${record.id} relayed responseTxHash: ${relayRecord.transactionHash}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(`fetch lnv20bridge status failed, error ${error}`);
    }
  }

  private genRelayInfoID(fromChainId: number, toChainId: number, provider: string, sourceToken: string): string {
    return `lnv20-${fromChainId}-${toChainId}-${provider}-${sourceToken}`;
  }

  private findPartnerByChainId(chainId: number) {
      return this.transferService.transfers.find((item) => item.chainId === chainId) ?? null;
  }

  private findPartnerByChainName(chainName: string, bridge: string) {
      return this.transferService.transfers.find((item) => item.chain === chainName && item.bridge === bridge) ?? null;
  }

  async fetchMarginInfoFromTarget(transfer: PartnerT2, index: number) {
    const { chain: toChain } = transfer;
    let latestNonce = this.fetchCache[index].latestRelayerInfoTargetNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnv20RelayInfoFirst(
            {
                toChain: toChain,
                bridge: this.bridgeName(transfer),
            },
            { targetNonce: 'desc' },
        );
        latestNonce = firstRecord ? Number(firstRecord.targetNonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 10, orderBy: nonce, orderDirection: asc, where: {updateType_in: [${RelayUpdateType.SLASH}, ${RelayUpdateType.WITHDRAW}]}, skip: ${latestNonce}) { id, remoteChainId, provider, margin, withdrawNonce, transactionHash, timestamp, sourceToken, targetToken } }`;
      const records = await axios
        .post(transfer.url, {
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
        const id = this.genRelayInfoID(record.remoteChainId, transfer.chainId, record.provider, record.sourceToken);
        const relayerInfo = await this.aggregationService.queryLnv20RelayInfoById({
          id: id,
        });
        if (relayerInfo) {
          const updateData = {
            margin: record.margin,
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
          await this.aggregationService.updateLnv20RelayInfo({
            where: { id: id },
            data: updateData,
          });
          latestNonce += 1;
          this.fetchCache[index].latestRelayerInfoTargetNonce = latestNonce;
          this.logger.log(
              `update lnv20 relay margin, id ${id}, margin ${record.margin}, withdrawNonce ${updateData.withdrawNonce}, nonce ${latestNonce}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(`fetch lnv20bridge relay records failed, error ${error}`);
    }
  }

  async fetchFeeInfoFromSource(transfer: PartnerT2, index: number) {
    const { chain: fromChain, symbols } = transfer;
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnv20RelayInfoFirst(
            {
                fromChain: fromChain,
                bridge: this.bridgeName(transfer),
            },
            { nonce: 'desc' },
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 10, orderBy: nonce, orderDirection: asc, where: {updateType: ${RelayUpdateType.PROVIDER_UPDATE}}, skip: ${latestNonce}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, baseFee, liquidityFeeRate } }`;

      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords)
        .catch((err) => {
            this.logger.warn(`query fee update failed err ${err}`);
        });

      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(transfer.chainId, record.remoteChainId, record.provider, record.sourceToken);
        const relayerInfo = await this.aggregationService.queryLnv20RelayInfoById({
          id: id,
        });
        const symbol = symbols.find((item) => item.address.toLowerCase() === record.sourceToken) ?? null;
        if (symbol == null) {
            return;
        }
        const toPartner = this.findPartnerByChainId(record.remoteChainId);
        if (!relayerInfo) {
          // if not exist create
          await this.aggregationService.createLnv20RelayInfo({
            id: id,
            fromChain: fromChain,
            toChain: toPartner.chain,
            bridge: this.bridgeName(transfer),
            nonce: latestNonce + 1,
            withdrawNonce: 0,
            relayer: record.provider,
            sendToken: record.sourceToken,
            transaction_hash: record.transactionHash,
            timestamp: Number(record.timestamp),
            margin: '0',
            baseFee: (BigInt(record.baseFee) + BigInt(symbol.protocolFee)).toString(),
            liquidityFeeRate: Number(record.liquidityFeeRate),
            slashCount: 0,
            targetNonce: 0,
            lastTransferId: '0x0000000000000000000000000000000000000000000000000000000000000000',
          });
        } else {
          // else update
          const updateData = {
            timestamp: Number(record.timestamp),
            nonce: latestNonce + 1,
            baseFee: BigInt(relayerInfo.baseFee).toString(),
            liquidityFeeRate: relayerInfo.liquidityFeeRate,
          };
          updateData.baseFee = (BigInt(record.baseFee) + BigInt(symbol.protocolFee)).toString();
          updateData.liquidityFeeRate = Number(record.liquidityFeeRate);
          await this.aggregationService.updateLnv20RelayInfo({
            where: { id: id },
            data: updateData,
          });
        }
        latestNonce += 1;
        this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
        this.logger.log(
          `update lnv20 relay info, id ${id}, type ${record.updateType}, basefee ${record.baseFee}, liquidityFee ${record.liquidityFeeRate}`
        );
      }
    } catch (error) {
      this.logger.warn(`fetch lnv20bridge relay records failed, error ${error}`);
    }
  }

  async fetchRelayInfo(transfer: PartnerT2, index: number) {
    const { chain: fromChain, symbols } = transfer;
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnv20RelayInfoFirst(
            {
                fromChain: fromChain,
                bridge: this.bridgeName(transfer),
            },
            { nonce: 'desc' },
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 10, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, margin, baseFee, liquidityFeeRate } }`;

      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords)
        .catch((err) => {
            this.logger.warn(`query relay update record failed err ${err}`);
        });

      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(transfer.chainId, record.remoteChainId, record.provider, record.sourceToken);
        const relayerInfo = await this.aggregationService.queryLnv20RelayInfoById({
          id: id,
        });
        const symbol = symbols.find((item) => item.address.toLowerCase() === record.sourceToken) ?? null;
        if (symbol == null) {
            return;
        }
        const toPartner = this.findPartnerByChainId(record.remoteChainId);
        if (!relayerInfo) {
          // if not exist create
          const margin = record.margin === null ? '0' : record.margin;
          await this.aggregationService.createLnv20RelayInfo({
            id: id,
            fromChain: fromChain,
            toChain: toPartner.chain,
            bridge: this.bridgeName(transfer),
            nonce: latestNonce,
            relayer: record.provider,
            sendToken: record.sourceToken,
            transaction_hash: record.transactionHash,
            timestamp: Number(record.timestamp),
            margin: margin,
            baseFee: (BigInt(record.baseFee) + BigInt(symbol.protocolFee)).toString(),
            liquidityFeeRate: Number(record.liquidityFeeRate),
            slashCount: 0,
            withdrawNonce: 0,
            targetNonce: 0,
            lastTransferId: '0x0000000000000000000000000000000000000000000000000000000000000000',
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
            updateData.baseFee = (BigInt(record.baseFee) + BigInt(symbol.protocolFee)).toString();
            updateData.liquidityFeeRate = Number(record.liquidityFeeRate);
          } else if (record.updateType == RelayUpdateType.WITHDRAW) {
            updateData.margin = record.margin;
          } else if (record.updateType == RelayUpdateType.SLASH) {
            updateData.margin = record.margin;
            updateData.slashCount = relayerInfo.slashCount + 1;
          }
          await this.aggregationService.updateLnv20RelayInfo({
            where: { id: id },
            data: updateData,
          });
        }
        latestNonce += 1;
        this.fetchCache[index].latestRelayerInfoNonce = latestNonce;
        this.logger.log(
          `update lnv20 relay info, id ${id}, type ${record.updateType}, margin ${record.margin}, basefee ${record.baseFee}, liquidityFee ${record.liquidityFeeRate}`
        );
      }
    } catch (error) {
      this.logger.warn(`fetch lnv20bridge relay records failed, error ${error}`);
    }
  }
}
