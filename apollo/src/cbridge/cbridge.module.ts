import { Module } from '@nestjs/common';
import { CbridgeService } from './cbridge.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [CbridgeService, TransferService],
})
export class CbridgeModule {}
