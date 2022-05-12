import { Args, Query, Resolver } from '@nestjs/graphql';
import { AggregationService } from './aggregation.service';
import { HistoryRecord, Prisma, PrismaClient } from '@prisma/client';

@Resolver()
export class AggregationResolver {
  constructor(private aggregationService: AggregationService) {}

  @Query()
  async historyRecordById(
    @Args('id') id: string
  ) {
    return this.aggregationService.historyRecordById({
      id: id,
    });
  }

  //async historyRecords(
    //@Args('sender') sender: string,
    //@Args('recipient') recipient: string,
    //@Args('row') row: number,
    //@Args('page') page: number
  //) {
    //return this.aggregationService.historyRecords({
      //sender,
      //recipient,
      //row,
      //page,
    //});
  //}
}
