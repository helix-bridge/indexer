import { Args, Query, Resolver } from '@nestjs/graphql';
import { AggregationService } from './aggregation.service';

@Resolver()
export class AggregationResolver {
  constructor(private aggregationService: AggregationService) {}

  @Query()
  async historyRecordById(@Args('id') id: string) {
    return this.aggregationService.queryHistoryRecordById({
      id: id,
    });
  }

  @Query()
  async historyRecords(
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('row') row: number,
    @Args('page') page: number
  ) {
    const skip = row * page || undefined;
    const take = row || undefined;
    const filter = [];
    if (sender) {
      filter.push({ sender: sender });
    }
    if (recipient) {
      filter.push({ recipient: recipient });
    }

    const where = sender || recipient ? { OR: filter } : undefined;
    return this.aggregationService.queryHistoryRecords({
      skip,
      take,
      where,
    });
  }
}
