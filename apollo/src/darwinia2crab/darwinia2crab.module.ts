import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Darwinia2crabService } from './darwinia2crab.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [ ConfigModule, AggregationModule, TasksModule ],
  providers: [Darwinia2crabService]
})
export class Darwinia2crabModule {}
