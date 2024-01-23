import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DailyStatistics, HistoryRecord, Prisma, PrismaClient } from '@prisma/client';
import { HistoryRecords, Lnv20RelayInfo, Lnv20RelayInfos } from '../graphql';
import { GuardService } from '../guard/guard.service';
// export lnbridge service configure
import { TransferService } from '../lnbridgev20/transfer.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class AggregationService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('aggregation');

  async onModuleInit() {
    await this.$connect();
  }

  constructor(
      private guardService: GuardService,
      private lnService: TransferService,
      private tasksService: TasksService
  ) {
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

  async createLnv20RelayInfo(data: Prisma.Lnv20RelayInfoCreateInput): Promise<Lnv20RelayInfo> {
    return this.lnv20RelayInfo.create({
      data,
    });
  }

  async updateLnv20RelayInfo(params: {
    where: Prisma.Lnv20RelayInfoWhereUniqueInput;
    data: Prisma.Lnv20RelayInfoUpdateInput;
  }): Promise<Lnv20RelayInfo> {
    const { where, data } = params;
    return this.lnv20RelayInfo.update({
      data,
      where,
    });
  }

  async queryLnv20RelayInfoById(
    lnv20RelayInfoWhereUniqueInput: Prisma.Lnv20RelayInfoWhereUniqueInput
  ): Promise<Lnv20RelayInfo | null> {
    return this.lnv20RelayInfo.findUnique({
      where: lnv20RelayInfoWhereUniqueInput,
    });
  }

  async queryLnv20RelayInfoFirst(
    lnv20RelayInfoWhereInput: Prisma.Lnv20RelayInfoWhereInput,
    orderBy?: Prisma.Enumerable<Prisma.Lnv20RelayInfoOrderByWithRelationAndSearchRelevanceInput>
  ): Promise<Lnv20RelayInfo | null> {
    return this.lnv20RelayInfo.findFirst({
      where: lnv20RelayInfoWhereInput,
      orderBy,
      //orderBy: { nonce: 'desc' },
    });
  }

  async queryLnv20RelayInfos(params: {
    skip?: number;
    take?: number;
    where?: Prisma.Lnv20RelayInfoWhereInput;
  }): Promise<Lnv20RelayInfos> {
    const { skip, take, where } = params;
    const records = await this.lnv20RelayInfo.findMany({
      skip,
      take,
      where,
    });
    const total = await this.lnv20RelayInfo.count({ where });

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
  
  tasksHealthCheck() {
      return this.tasksService.queryHealthChecks();
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

  async calculateLnv20RelayerPoint(
    token: string,
    amount: bigint,
    decimals: number,
    relayerInfo: Lnv20RelayInfo
  ): Promise<number | null> {
    const orderBy = { startTime: Prisma.SortOrder.desc };
    var marginUsed = BigInt(0);
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
    if (total != records.length) {
      this.logger.warn(`pending records too large relayer ${relayerInfo.relayer}, total ${total}`);
      return null;
    }
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
    const firstSuccess = await this.queryHistoryRecordFirst(
      {
        fromChain: relayerInfo.fromChain,
        toChain: relayerInfo.toChain,
        bridge: 'lnbridgev20',
        relayer: relayerInfo.relayer,
        sendTokenAddress: token,
        result: 3,
      },
      { nonce: 'desc' }
    );
    const F =
      BigInt(relayerInfo.baseFee) +
      (BigInt(relayerInfo.liquidityFeeRate) * amount) / BigInt(100000);
    const P = total;
    const R = relayerInfo.slashCount;
    const now = Date.now() / 1000;
    var S = firstSuccess ? Number(firstSuccess.messageNonce) : 0;
    var T_0 = now - (firstSuccess ? firstSuccess.startTime : 0);
    var T_1 = firstSuccess ? firstSuccess.endTime - firstSuccess.startTime : 0;
    if (total > 0) {
      S = Number(records[0].messageNonce);
      T_0 = now - records[0].startTime;
    }
    const w =
      P * 0.5 + Math.max(R - S * 0.001, 0) * 0.1 + Math.max(1 - T_0 * 0.001, 0) * 0.1 + T_1 * 0.2;
    return Number(F / BigInt(10 ** decimals)) * w;
  }
}
