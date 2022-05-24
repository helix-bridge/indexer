import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Crab2smartService } from './crab2smart.service';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [ ConfigModule, AggregationModule, TasksModule ],
  providers: [Crab2smartService]
})
export class Crab2smartModule {}
