import { Module } from '@nestjs/common';
import { XcmService } from './xcm.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [XcmService, TransferService],
})
export class XcmModule {}
