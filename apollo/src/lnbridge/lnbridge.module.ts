import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { LnbridgeService } from './lnbridge.service';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [LnbridgeService, TransferService],
})
export class LnbridgeModule {}
