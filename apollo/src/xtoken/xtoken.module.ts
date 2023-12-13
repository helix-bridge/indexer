import { Module } from '@nestjs/common';
import { xTokenService } from './xtoken.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [xTokenService, TransferService],
})
export class xTokenModule {}
