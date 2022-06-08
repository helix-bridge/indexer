import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { HistoryRecord, DailyStatistics, Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class AggregationService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
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
      orderBy: { startTime: 'desc' },
    });
  }

  async queryHistoryRecords(params: {
    skip?: number;
    take?: number;
    where?: Prisma.HistoryRecordWhereInput;
  }): Promise<HistoryRecord[]> {
    const { skip, take, where } = params;

    return this.historyRecord.findMany({
      skip,
      take,
      where,
      orderBy: { startTime: 'desc' },
    });
  }

  // daily statistics
  async createDailyStatistics(data: Prisma.DailyStatisticsCreateInput): Promise<DailyStatistics> {
    return this.dailyStatistics.create({
      data,
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

