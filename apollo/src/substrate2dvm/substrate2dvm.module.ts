import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { Substrate2dvmService } from './substrate2dvm.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Substrate2dvmService],
})
export class Substrate2dvmModule {}
