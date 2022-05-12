import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { HistoryRecord, Prisma, PrismaClient } from '@prisma/client';

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

  async historyRecordById(
      historyRecordWhereUniqueInput: Prisma.HistoryRecordWhereUniqueInput,
  ): Promise<HistoryRecord | null> {
    return this.historyRecord.findUnique({
        where: historyRecordWhereUniqueInput,
    });
  }
}
