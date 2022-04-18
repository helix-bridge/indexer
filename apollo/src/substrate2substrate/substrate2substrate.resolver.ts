import { Args, Query, Resolver } from '@nestjs/graphql';
import { Substrate2substrateService } from './substrate2substrate.service';

@Resolver('burnRecordEntities')
export class BurnRecordEntitiesResolver {
  constructor(private substrate2SubstrateService: Substrate2substrateService) {}

  @Query()
  async burnRecordEntities(
    @Args('first') first: number,
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('start_timestamp') start_timestamp: number
  ) {
    return this.substrate2SubstrateService.burnRecordEntities({
      first,
      sender,
      recipient,
      start_timestamp,
    });
  }
}

@Resolver('lockRecordEntities')
export class LockRecordEntitiesResolver {
  constructor(private substrate2SubstrateService: Substrate2substrateService) {}

  @Query()
  async lockRecordEntities(
    @Args('first') first: number,
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('start_timestamp') start_timestamp: number
  ) {
    return this.substrate2SubstrateService.lockRecordEntities({
      first,
      sender,
      recipient,
      start_timestamp,
    });
  }
}

@Resolver('s2sRecords')
export class S2sRecordsResolver {
  constructor(private substrate2SubstrateService: Substrate2substrateService) {}

  @Query()
  async s2sRecords(
    @Args('first') first: number,
    @Args('sender') sender: string,
    @Args('start_timestamp') start_timestamp: number
  ) {
    return this.substrate2SubstrateService.s2sRecords({
      first,
      start_timestamp,
      sender,
    });
  }
}

@Resolver('dailyStatistics')
export class DailyStatisticsResolver {
  constructor(private substrate2SubstrateService: Substrate2substrateService) {}

  @Query()
  async dailyStatistics(
    @Args('first') first: number,
    @Args('timepast') timepast: number,
    @Args('chain') chain: string
  ) {
    return this.substrate2SubstrateService.dailyStatistics({
      first,
      chain,
      timepast,
    });
  }
}
