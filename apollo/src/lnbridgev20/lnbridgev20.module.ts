import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { Lnbridgev20Service } from './lnbridgev20.service';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Lnbridgev20Service, TransferService],
})
export class Lnbridgev20Module {}
