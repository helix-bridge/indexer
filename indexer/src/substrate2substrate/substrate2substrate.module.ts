import { Module } from '@nestjs/common';
import {
  BurnRecordEntitiesResolver,
  DailyStatisticsResolver,
  LockRecordEntitiesResolver,
  S2sRecordsResolver,
} from './substrate2substrate.resolver';
import { Substrate2substrateService } from './substrate2substrate.service';

@Module({
  providers: [
    Substrate2substrateService,
    BurnRecordEntitiesResolver,
    DailyStatisticsResolver,
    S2sRecordsResolver,
    LockRecordEntitiesResolver,
  ],
})
export class Substrate2substrateModule {}
