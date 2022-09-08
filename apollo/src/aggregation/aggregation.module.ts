import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { AggregationResolver } from './aggregation.resolver';
import { GuardService } from '../guard/guard.service';

@Module({
  providers: [AggregationService, AggregationResolver, GuardService],
  exports: [AggregationService],
})
export class AggregationModule {}
