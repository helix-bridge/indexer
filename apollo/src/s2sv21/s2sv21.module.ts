import { Module } from '@nestjs/common';
import { S2sv21Service } from './s2sv21.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [S2sv21Service, TransferService],
})
export class S2sv21Module {}
