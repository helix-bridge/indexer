import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { L2arbitrumService } from './l2arbitrum.service';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [L2arbitrumService, TransferService],
})
export class L2arbitrumModule {}
