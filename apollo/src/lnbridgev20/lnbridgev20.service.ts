import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { TransferService } from './transfer.service';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';
import {
  TransferT1,
  RecordStatus,
  FetchCacheInfo,
  BridgeBaseConfigure,
} from '../base/TransferServiceT1';

export enum RelayUpdateType {
  PROVIDER_UPDATE,
  SLASH,
  WITHDRAW,
}

export interface FetchCacheRelayInfo extends FetchCacheInfo {
  latestRelayerInfoNonce: number;
  latestRelayerInfoTargetNonce: number;
}

@Injectable()
export class Lnbridgev20Service implements OnModuleInit {
  private readonly logger = new Logger('lnbridgev2.0');
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

  protected genID(transfer: TransferT1, transferId: string): string {
    return `lnbridgev20-${transfer.bridge}-${transferId}`;
  }

  async onModuleInit() {
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
    if (item.isLock) {
        await this.fetchRelayInfo(item, index);
    } else {
        await this.fetchFeeInfoFromSource(item, index);
        await this.fetchMarginInfoFromTarget(item, index);
    }
    // from source chain
    await this.fetchRecords(item, index);
    // from target chain
    await this.fetchStatus(item, index);
    this.fetchCache[index].isSyncingHistory = false;
  }

  private bridgeName(transfer: TransferT1): string {
      const direction = transfer.isLock ? 'opposite' : 'default'
      return 'lnbridgev20-' + direction;
  }

  // fetch records from src chain
  // 1. tx sent but not slash, save and use it as slash params, fetch status from target chain
  // 2. tx sent and slashed, save it directly, don't fetch status from target chain
  async fetchRecords(transfer: TransferT1, index: number) {
    // the nonce of cBridge message is not increased
    let latestNonce = this.fetchCache[index].latestNonce;
    const { source: from, target: to, symbols } = transfer;
    try {
      if (latestNonce === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst(
          {
            fromChain: from.chain,
            bridge: this.bridgeName(transfer),
          },
          { nonce: 'desc' }
        );
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2TransferRecords(first: 10, orderBy: messageNonce, orderDirection: asc, skip: ${latestNonce}) { id, messageNonce, provider, sender, receiver, token, amount, transaction_hash, timestamp, fee, liquidate_withdrawn_sender, liquidate_transaction_hash, liquidate_withdrawn_timestamp } }`;

      const records = await axios
        .post(from.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2TransferRecords);
      if (records && records.length > 0) {
        for (const record of records) {
          const symbol = symbols.find((item) => item.address === record.token) ?? null;
          if (!symbol) {
            continue;
          }
          const fromToken = symbol.from;
          const toToken = symbol.to;

          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.id),
            relayer: record.provider,
            fromChain: from.chain,
            toChain: to.chain,
            bridge: this.bridgeName(transfer),
            messageNonce: record.messageNonce.toString(),
            nonce: latestNonce + 1,
            requestTxHash: record.transaction_hash,
            sender: record.sender,
            recipient: record.receiver,
            sendToken: fromToken,
            recvToken: toToken,
            sendAmount: record.amount,
            recvAmount: '0',
            startTime: Number(record.timestamp),
            endTime: 0,
            result: 0,
            fee: record.fee,
            feeToken: fromToken,
            responseTxHash: '',
            reason: '',
            sendTokenAddress: record.token,
            recvTokenAddress: symbol.toAddress,
            endTxHash: '',
            confirmedBlocks: '',
          });
          const providerId = this.genRelayInfoID(transfer, record.provider, record.token);
          await this.aggregationService.updateLnv20RelayInfo({
            where: { id: providerId },
            data: {lastTransferId: record.id},
          });
          latestNonce += 1;
        }
        if (records && records.length > 0) {
          this.logger.log(
            `lnbridgev2 new records, from ${from.chain}, to ${to.chain}, latest nonce ${latestNonce}, added ${records.length}`
          );
        }
        this.fetchCache[index].latestNonce = latestNonce;
      }
    } catch (error) {
      this.logger.warn(
        `lnbridgev2 fetch record failed, from ${from.chain}, to ${to.chain}, ${error}`
      );
    }
  }

  // fetch slash status from source chain
  async queryRecord(transfer: TransferT1, id: string) {
    const query = `query { lnv2TransferRecord(id: "${id}") { id, fee, liquidate_withdrawn_sender, liquidate_transaction_hash, liquidate_withdrawn_timestamp } }`;
    const record = await axios
      .post(transfer.source.url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv2TransferRecord);
    return record;
  }

  // fetch status from target chain and source chain(slash result)
  // 1. relayed, finished
  // 2. cancel inited, save timestamp to check if users can cancel tx or ln can relay msg
  // 3. cancel request sent, save status and fetch status from src chain
  async fetchStatus(transfer: TransferT1, index: number) {
    const { source: from, target: to } = transfer;
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.fetchCache[index].skip,
          take: this.baseConfigure.takeEachTime,
          where: {
            fromChain: from.chain,
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
          const query = `query { lnv2RelayRecord(id: "${transferId}") { id, timestamp, transaction_hash, slasher }}`;
          const relayRecord = await axios
            .post(to.url, {
              query: query,
              variables: null,
            })
            .then((res) => res.data?.data?.lnv2RelayRecord);

          if (relayRecord) {
            txStatus = RecordStatus.success;
            const updateData = {
              result: RecordStatus.success,
              responseTxHash: relayRecord.transaction_hash,
              endTxHash: relayRecord.transaction_hash,
              endTime: Number(relayRecord.timestamp), // we use this time to check slash time
              recvAmount: record.sendAmount,
              recvToken: record.recvToken,
              relayer: relayRecord.slasher,
            };

            await this.aggregationService.updateHistoryRecord({
              where: { id: record.id },
              data: updateData,
            });

            this.logger.log(
              `lnv2bridge new status id: ${record.id} relayed responseTxHash: ${relayRecord.transaction_hash}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(`fetch lnv20bridge status failed, error ${error}`);
    }
  }

  private genRelayInfoID(transfer: TransferT1, provider: string, token: string): string {
    const { source: from, target: to } = transfer;
    return 'lnv20-' + from.chain + '-' + to.chain + '-' + provider + '-' + token;
  }

  async fetchMarginInfoFromTarget(transfer: TransferT1, index: number) {
    const { source: from, target: to } = transfer;
    let latestNonce = this.fetchCache[index].latestRelayerInfoTargetNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnv20RelayInfoFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: this.bridgeName(transfer),
        });
        latestNonce = firstRecord ? Number(firstRecord.targetNonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 10, orderBy: timestamp, orderDirection: asc, , skip: ${latestNonce}) { id, updateType, provider, margin, withdrawNonce, transaction_hash, timestamp, token } }`;
      const records = await axios
        .post(to.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords);

      if (records && records.length > 0) {
        const record = records[0];
        // query by relayer
        const id = this.genRelayInfoID(transfer, record.provider, record.token);
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
          } else {
            updateData.withdrawNonce = Number(record.withdrawNonce);
          }
          await this.aggregationService.updateLnv20RelayInfo({
            where: { id: id },
            data: updateData,
          });
          latestNonce += 1;
          this.fetchCache[index].latestRelayerInfoTargetNonce = latestNonce;
          this.logger.log(
              `update lnv20 relay margin, id ${id}, margin ${record.margin}, withdrawNonce ${record.withdrawNonce}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(`fetch lnv20bridge relay records failed, error ${error}`);
    }
  }

  async fetchFeeInfoFromSource(transfer: TransferT1, index: number) {
    const { source: from, target: to, symbols } = transfer;
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnv20RelayInfoFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: this.bridgeName(transfer),
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 10, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) { id, updateType, provider, transaction_hash, timestamp, token, baseFee, liquidityFeeRate } }`;

      const records = await axios
        .post(from.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords);

      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(transfer, record.provider, record.token);
        const relayerInfo = await this.aggregationService.queryLnv20RelayInfoById({
          id: id,
        });
        const symbol = symbols.find((item) => item.address === record.token) ?? null;
        if (symbol == null) {
            return;
        }
        if (!relayerInfo) {
          // if not exist create
          await this.aggregationService.createLnv20RelayInfo({
            id: id,
            fromChain: from.chain,
            toChain: to.chain,
            bridge: this.bridgeName(transfer),
            nonce: latestNonce + 1,
            withdrawNonce: 0,
            relayer: record.provider,
            sendToken: record.token,
            transaction_hash: record.transaction_hash,
            timestamp: Number(record.timestamp),
            margin: '0',
            baseFee: (BigInt(record.baseFee) + BigInt(symbol.protocolFee)).toString(),
            liquidityFeeRate: Number(record.liquidityFeeRate),
            slashCount: 0,
            targetNonce: 0,
            lastTransferId: '0x00000000000000000000000000000000',
          });
        } else {
          // else update
          const updateData = {
            timestamp: Number(record.timestamp),
            nonce: latestNonce + 1,
            baseFee: BigInt(relayerInfo.baseFee).toString(),
            liquidityFeeRate: relayerInfo.liquidityFeeRate,
          };
          if (record.updateType == RelayUpdateType.PROVIDER_UPDATE) {
            updateData.baseFee = (BigInt(record.baseFee) + BigInt(symbol.protocolFee)).toString();
            updateData.liquidityFeeRate = Number(record.liquidityFeeRate);
          }
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

  async fetchRelayInfo(transfer: TransferT1, index: number) {
    const { source: from, target: to, symbols } = transfer;
    let latestNonce = this.fetchCache[index].latestRelayerInfoNonce;
    try {
      if (latestNonce == -1) {
        const firstRecord = await this.aggregationService.queryLnv20RelayInfoFirst({
          fromChain: from.chain,
          toChain: to.chain,
          bridge: this.bridgeName(transfer),
        });
        latestNonce = firstRecord ? Number(firstRecord.nonce) : 0;
      }
      const query = `query { lnv2RelayUpdateRecords(first: 10, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) { id, updateType, provider, transaction_hash, timestamp, token, margin, baseFee, liquidityFeeRate } }`;

      const records = await axios
        .post(from.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.lnv2RelayUpdateRecords);

      // query nonce big then latestNonce
      for (const record of records) {
        // query by relayer
        const id = this.genRelayInfoID(transfer, record.provider, record.token);
        const relayerInfo = await this.aggregationService.queryLnv20RelayInfoById({
          id: id,
        });
        const symbol = symbols.find((item) => item.address === record.token) ?? null;
        if (symbol == null) {
            return;
        }
        if (!relayerInfo) {
          // if not exist create
          await this.aggregationService.createLnv20RelayInfo({
            id: id,
            fromChain: from.chain,
            toChain: to.chain,
            bridge: this.bridgeName(transfer),
            nonce: latestNonce,
            relayer: record.provider,
            sendToken: record.token,
            transaction_hash: record.transaction_hash,
            timestamp: Number(record.timestamp),
            margin: record.margin,
            baseFee: (BigInt(record.baseFee) + BigInt(symbol.protocolFee)).toString(),
            liquidityFeeRate: Number(record.liquidityFeeRate),
            slashCount: 0,
            withdrawNonce: 0,
            targetNonce: 0,
            lastTransferId: '0x00000000000000000000000000000000',
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
