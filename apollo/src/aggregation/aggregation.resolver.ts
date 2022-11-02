import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { isEmpty, isNull, isUndefined } from 'lodash';
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
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('row') row: number,
    @Args('page') page: number,
    @Args('results') results: number[]
  ) {
    const skip = row * page || 0;
    const take = row || 10;
    const isValid = (item) =>
      !Object.values(item).some((value) => isUndefined(value) || isNull(value) || value === '');

    const accFilters = [{ sender }, { recipient }].filter(isValid);
    const accountCondition = accFilters.length ? { OR: accFilters } : {};
    const resultCondition = results && results.length ? { AND: { result: { in: results } } } : {};
    const chainFilters = [ { fromChain }, { toChain }].filter(isValid);
    const chainCondition = chainFilters.length ? { AND: chainFilters } : {};

    const conditions = {
      ...accountCondition,
      ...resultCondition,
      ...chainCondition,
    };

    const where = isEmpty(conditions) ? undefined : conditions;

    return this.aggregationService.queryHistoryRecords({
      skip,
      take,
      where,
    });
  }

  // daily statistics
  @Query()
  async queryDailyStatistics(
    @Args('timepast') timepast: number,
    @Args('first') take: number,
    @Args('from') fromChain: string,
    @Args('to') toChain: string,
    @Args('bridge') bridge: string,
    @Args('token') token: string
  ) {
    const filter = [];
    if (fromChain) {
      filter.push({ fromChain });
    }
    if (toChain) {
      filter.push({ toChain });
    }
    if (bridge) {
      filter.push({ bridge });
    }
    if (token) {
      filter.push({ token });
    }

    const now = Date.now() / 1000;
    const timelimit = Math.floor(now - timepast);
    const where = { AND: { timestamp: { gt: timelimit }, AND: filter } };
    return this.aggregationService.queryDailyStatistics({
      take,
      where,
    });
  }

  @Mutation()
  async addGuardSignature(@Args('id') id: string, @Args('signature') signature: string) {
    await this.aggregationService.addGuardSignature({
      where: { id: id },
      signature: signature,
    });
  }

  @Query()
  async queryGuardNeedSignature(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('bridge') bridge: string,
    @Args('guardAddress') guardAddress: string,
    @Args('row') row: number
  ) {
    const take = row || 10;
    const statusPendingToClaim = 2;
    const baseFilters = { fromChain, toChain, bridge };
    const guardNotSigned = { guardSignatures: { search: '!' + guardAddress } };
    const filterResponsed = { responseTxHash: '', result: statusPendingToClaim };

    const where = {
      ...baseFilters,
      ...guardNotSigned,
      ...filterResponsed,
    };

    return this.aggregationService.queryHistoryRecords({
      skip: 0,
      take,
      where,
    });
  }
}
