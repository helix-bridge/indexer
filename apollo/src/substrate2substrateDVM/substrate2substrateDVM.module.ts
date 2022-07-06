import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { TasksModule } from '../tasks/tasks.module';
import { Substrate2substrateDVMService } from './substrate2substrateDVM.service';
import { TransferService } from './transfer.service';

@Module({
  imports: [AggregationModule, TasksModule],
  providers: [Substrate2substrateDVMService, TransferService],
})
export class Substrate2substrateDVMModule {}
