import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { AggregationResolver } from './aggregation.resolver';
import { TasksModule } from '../tasks/tasks.module';
import { TransferService as Lnv2Service } from '../lnv2/transfer.service';
import { TransferService as Lnv3Service} from '../lnv3/transfer.service';

@Module({
  imports: [TasksModule],
  providers: [AggregationService, AggregationResolver, Lnv2Service, Lnv3Service],
  exports: [AggregationService],
})
export class AggregationModule {}
