import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { AggregationResolver } from './aggregation.resolver';

@Module({
  providers: [AggregationService, AggregationResolver],
  exports: [AggregationService],
})
export class AggregationModule {}
