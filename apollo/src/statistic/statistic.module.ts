import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { StatisticService } from './statistic.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [StatisticService],
})
export class StatisticModule {}
