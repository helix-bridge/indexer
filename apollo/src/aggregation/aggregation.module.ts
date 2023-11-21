import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { AggregationResolver } from './aggregation.resolver';
import { GuardService } from '../guard/guard.service';
import { TransferService } from '../lnbridgev20/transfer.service';

@Module({
  providers: [AggregationService, AggregationResolver, GuardService, TransferService],
  exports: [AggregationService],
})
export class AggregationModule {}
