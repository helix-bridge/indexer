import { Module } from '@nestjs/common';
import { WtokenService } from './wtoken.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [WtokenService, TransferService],
})
export class WtokenModule {}
