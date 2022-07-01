import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { Substrate2substrateDVMService } from './substrate2substrateDVM.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Substrate2substrateDVMService],
})
export class Substrate2substrateDVMModule {}
