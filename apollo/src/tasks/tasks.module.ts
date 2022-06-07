import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AggregationModule } from '../aggregation/aggregation.module';

@Module({
  imports: [AggregationModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
