import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { AggregationResolver } from './aggregation.resolver';
import { TasksModule } from '../tasks/tasks.module';
import { GuardService } from '../guard/guard.service';
import { TransferService as Lnv2Service } from '../lnbridgev20/transfer.service';
import { TransferService as Lnv3Service} from '../lnv3/transfer.service';

@Module({
  imports: [TasksModule],
  providers: [AggregationService, AggregationResolver, GuardService, Lnv2Service, Lnv3Service],
  exports: [AggregationService],
})
export class AggregationModule {}
