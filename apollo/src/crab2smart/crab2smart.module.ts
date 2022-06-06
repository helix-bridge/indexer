import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { Crab2smartService } from './crab2smart.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Crab2smartService],
})
export class Crab2smartModule {}
