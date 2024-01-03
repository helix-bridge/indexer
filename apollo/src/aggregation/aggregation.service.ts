import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DailyStatistics, HistoryRecord, Prisma, PrismaClient } from '@prisma/client';
import { HistoryRecords, LnBridgeRelayInfo, LnBridgeRelayInfos } from '../graphql';
import { GuardService } from '../guard/guard.service';
// export lnbridge service configure
import { TransferService } from '../lnbridgev20/transfer.service';

@Injectable()
export class AggregationService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('aggregation');

  async onModuleInit() {
    await this.$connect();
  }

  constructor(private guardService: GuardService, private lnService: TransferService) {
    super();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async createHistoryRecord(data: Prisma.HistoryRecordCreateInput): Promise<HistoryRecord> {
    return this.historyRecord.create({
      data,
    });
  }

  async deleteHistoryRecord(data: Prisma.HistoryRecordWhereUniqueInput): Promise<HistoryRecord> {
    return this.historyRecord.delete({
      where: data,
    });
  }

  async updateHistoryRecord(params: {
    where: Prisma.HistoryRecordWhereUniqueInput;
    data: Prisma.HistoryRecordUpdateInput;
  }): Promise<HistoryRecord> {
    const { where, data } = params;
    return this.historyRecord.update({
      data,
      where,
    });
  }

  async queryLnBridgeRelayInfoFirst(
    lnBridgeRelayInfoWhereInput: Prisma.LnBridgeRelayInfoWhereInput,
    orderBy?: Prisma.Enumerable<Prisma.LnBridgeRelayInfoOrderByWithRelationAndSearchRelevanceInput>
  ): Promise<LnBridgeRelayInfo | null> {
    return this.lnBridgeRelayInfo.findFirst({
      where: lnBridgeRelayInfoWhereInput,
      orderBy,
    });
  }

  async createLnBridgeRelayInfo(
    data: Prisma.LnBridgeRelayInfoCreateInput
  ): Promise<LnBridgeRelayInfo> {
    return this.lnBridgeRelayInfo.create({
      data,
    });
  }

  async queryLnBridgeRelayInfoById(
    lnBridgeRelayInfoWhereUniqueInput: Prisma.LnBridgeRelayInfoWhereUniqueInput
  ): Promise<LnBridgeRelayInfo | null> {
    return this.lnBridgeRelayInfo.findUnique({
      where: lnBridgeRelayInfoWhereUniqueInput,
    });
  }

  async updateLnBridgeRelayInfo(params: {
    where: Prisma.LnBridgeRelayInfoWhereUniqueInput;
    data: Prisma.LnBridgeRelayInfoUpdateInput;
  }): Promise<LnBridgeRelayInfo> {
    const { where, data } = params;
    return this.lnBridgeRelayInfo.update({
      data,
      where,
    });
  }

  async queryLnBridgeRelayInfos(params: {
    skip?: number;
    take?: number;
    where?: Prisma.LnBridgeRelayInfoWhereInput;
  }): Promise<LnBridgeRelayInfos> {
    const { skip, take, where } = params;
    const records = await this.lnBridgeRelayInfo.findMany({
      skip,
      take,
      where,
    });
    const total = await this.lnBridgeRelayInfo.count({ where });

    return { total, records };
  }

  async addGuardSignature(params: {
    where: Prisma.HistoryRecordWhereUniqueInput;
    signature: string;
  }) {
    const { where, signature } = params;
    try {
      const record = await this.historyRecord.findUnique({
        where,
      });
      // tx has been redeemed
      if (record.responseTxHash !== '') {
        return;
      }
      const guard = this.guardService.recoverPubkey(
        record.fromChain,
        record.toChain,
        record.bridge,
        BigInt(record.messageNonce).toString(),
        record.endTime.toString(),
        record.recvTokenAddress,
        record.recipient,
        record.recvAmount,
        signature
      );
      if (!guard) {
        return;
      }
      const value = guard + '-' + signature;
      const signatures = record.guardSignatures === null ? [] : record.guardSignatures.split(',');
      const exist = signatures.find((sig) => sig === value);
      if (exist) {
        return;
      }
      signatures.push(value);

      await this.historyRecord.update({
        where,
        data: {
          guardSignatures: signatures.sort().join(','),
        },
      });
    } catch (error) {
      this.logger.warn(`add guard signature failed ${where}, ${signature}, ${error}`);
    }
  }

  async updateConfirmedBlock(params: {
    where: Prisma.HistoryRecordWhereUniqueInput;
    block: string;
  }) {
    const { where, block } = params;
    try {
      const record = await this.historyRecord.findUnique({
        where,
      });
      // tx has been redeemed
      if (record.responseTxHash !== '') {
        return;
      }
      await this.historyRecord.update({
        where,
        data: {
          confirmedBlocks: block,
        },
      });
    } catch (error) {
      this.logger.warn(`update confirmed block failed ${where}, ${block}, ${error}`);
    }
  }

  async queryHistoryRecordById(
    historyRecordWhereUniqueInput: Prisma.HistoryRecordWhereUniqueInput
  ): Promise<HistoryRecord | null> {
    return this.historyRecord.findUnique({
      where: historyRecordWhereUniqueInput,
    });
  }

  async queryHistoryRecordFirst(
    historyRecordWhereInput: Prisma.HistoryRecordWhereInput,
    orderBy?: Prisma.Enumerable<Prisma.HistoryRecordOrderByWithRelationAndSearchRelevanceInput>
  ): Promise<HistoryRecord | null> {
    return this.historyRecord.findFirst({
      where: historyRecordWhereInput,
      orderBy,
    });
  }

  async queryHistoryRecords(params: {
    skip?: number;
    take?: number;
    where?: Prisma.HistoryRecordWhereInput;
    orderBy?: Prisma.Enumerable<Prisma.HistoryRecordOrderByWithRelationAndSearchRelevanceInput>;
  }): Promise<HistoryRecords> {
    const { skip, take, where, orderBy } = params;
    const records = await this.historyRecord.findMany({
      skip,
      take,
      where,
      orderBy,
    });
    const total = await this.historyRecord.count({ where });

    return { total, records };
  }

  // daily statistics
  async createDailyStatistics(data: Prisma.DailyStatisticsCreateInput): Promise<DailyStatistics> {
    return this.dailyStatistics.create({
      data,
    });
  }

  async updateDailyStatistics(params: {
    where: Prisma.DailyStatisticsWhereUniqueInput;
    data: Prisma.DailyStatisticsUpdateInput;
  }): Promise<DailyStatistics> {
    const { where, data } = params;
    return this.dailyStatistics.update({
      data,
      where,
    });
  }

  async queryDailyStatistics(params: {
    skip?: number;
    take?: number;
    where?: Prisma.DailyStatisticsWhereInput;
  }): Promise<DailyStatistics[]> {
    const { skip, take, where } = params;

    return this.dailyStatistics.findMany({
      skip,
      take,
      where,
      orderBy: { timestamp: 'desc' },
    });
  }

  checkLnBridgeConfigure(params: {
    sourceChainId: number;
    targetChainId: number;
    sourceToken: string;
    targetToken: string;
  }): boolean {
    const { sourceChainId, targetChainId, sourceToken, targetToken } = params;
    const bridge = this.lnService.transfers.find((item) => item.chainId === sourceChainId);
    if (bridge === undefined) {
      return false;
    }
    const tokenBridge = bridge.tokens.find(
      (item) => item.fromAddress.toLowerCase() === sourceToken.toLowerCase()
    );
    if (tokenBridge === undefined) {
      return false;
    }
    const targetInfo = tokenBridge.remoteInfos.find(
      (item) =>
        item.toChain === targetChainId && item.toAddress.toLowerCase() === targetToken.toLowerCase()
    );
    return targetInfo !== undefined;
  }

  async queryDailyStatisticsFirst(
    dailyStatisticsWhereInput: Prisma.DailyStatisticsWhereInput
  ): Promise<DailyStatistics | null> {
    return this.dailyStatistics.findFirst({
      where: dailyStatisticsWhereInput,
      orderBy: { timestamp: 'desc' },
    });
  }

  async calculateLnBridgeRelayerPoint(
    token: string,
    amount: bigint,
    decimals: number,
    relayerInfo: LnBridgeRelayInfo
  ): Promise<number | null> {
    const orderBy = { startTime: Prisma.SortOrder.desc };
    const pendingRecords = await this.queryHistoryRecords({
      where: {
        fromChain: relayerInfo.fromChain,
        toChain: relayerInfo.toChain,
        bridge: relayerInfo.bridge,
        relayer: relayerInfo.relayer,
        sendTokenAddress: token,
        endTxHash: '',
      },
      orderBy,
    });
    const { total, records } = pendingRecords;

    if (relayerInfo.version == 'lnv2') {
      var marginUsed = BigInt(0);
      for (const pendingRecord of records) {
        marginUsed += BigInt(pendingRecord.sendAmount);
      }
      // margin not enough, todo add finefund
      if (BigInt(relayerInfo.margin) < marginUsed + amount) {
        this.logger.warn(
          `margin not enough, margin ${relayerInfo.margin}, used ${marginUsed}, amount ${amount}, relayer ${relayerInfo.relayer}`
        );
        return null;
      }
    }
    const F =
      BigInt(relayerInfo.baseFee) +
      (BigInt(relayerInfo.liquidityFeeRate) * amount) / BigInt(100000);
    const R = relayerInfo.slashCount;
    const w = 1 + R * 0.1;
    return Number(F / BigInt(10 ** decimals)) * w;
  }
}
