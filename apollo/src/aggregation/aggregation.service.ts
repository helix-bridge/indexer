import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DailyStatistics, HistoryRecord, Prisma, PrismaClient } from '@prisma/client';
import { HistoryRecords } from '../graphql';
import { GuardService } from '../guard/guard.service';

@Injectable()
export class AggregationService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('cBridge');

  async onModuleInit() {
    await this.$connect();
  }

  constructor(private guardService: GuardService) {
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

  async queryHistoryRecordById(
    historyRecordWhereUniqueInput: Prisma.HistoryRecordWhereUniqueInput
  ): Promise<HistoryRecord | null> {
    return this.historyRecord.findUnique({
      where: historyRecordWhereUniqueInput,
    });
  }

  async queryHistoryRecordFirst(
    historyRecordWhereInput: Prisma.HistoryRecordWhereInput
  ): Promise<HistoryRecord | null> {
    return this.historyRecord.findFirst({
      where: historyRecordWhereInput,
      orderBy: { nonce: 'desc' },
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

  async queryDailyStatisticsFirst(
    dailyStatisticsWhereInput: Prisma.DailyStatisticsWhereInput
  ): Promise<DailyStatistics | null> {
    return this.dailyStatistics.findFirst({
      where: dailyStatisticsWhereInput,
      orderBy: { timestamp: 'desc' },
    });
  }
}
