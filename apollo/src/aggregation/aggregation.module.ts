import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { AggregationResolver } from './aggregation.resolver';
import { TasksModule } from '../tasks/tasks.module';
import { GuardService } from '../guard/guard.service';
import { TransferService } from '../lnbridgev20/transfer.service';

@Module({
  imports: [TasksModule],
  providers: [AggregationService, AggregationResolver, GuardService, TransferService],
  exports: [AggregationService],
})
export class AggregationModule {}
