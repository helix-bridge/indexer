import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { Darwinia2crabService } from './darwinia2crab.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Darwinia2crabService],
})
export class Darwinia2crabModule {}
