import { Module } from '@nestjs/common';
import { S2sv2Service } from './s2sv2.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [S2sv2Service, TransferService],
})
export class S2sv2Module {}
