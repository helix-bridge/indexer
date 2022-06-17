import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { Substrate2parachainService } from './substrate2parachain.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Substrate2parachainService],
})
export class Substrate2parachainModule {}
