import { Module } from '@nestjs/common';
import { Sub2ethv2Service } from './sub2ethv2.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Sub2ethv2Service, TransferService],
})
export class Sub2ethv2Module {}
