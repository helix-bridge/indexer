import { Args, Query, Resolver } from '@nestjs/graphql';
import { Substrate2substrateService } from './substrate2substrate.service';

@Resolver('burnRecordEntities')
export class BurnRecordEntitiesResolver {
  constructor(private substrate2SubstrateService: Substrate2substrateService) {}

  @Query()
  async burnRecords(
    @Args('first') first: number,
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('startTime') startTime: number
  ) {
    return this.substrate2SubstrateService.burnRecordEntities({
      first,
      sender,
      recipient,
      startTime,
    });
  }

  @Query()
  async burnRecord(@Args('id') id: string) {
    return this.substrate2SubstrateService.burnRecord(id);
  }

  @Query()
  async dvmLockRecord(@Args('id') id: string) {
    return this.substrate2SubstrateService.dvmLockedRecord(id);
  }
}

@Resolver('lockRecordEntities')
export class LockRecordEntitiesResolver {
  constructor(private substrate2SubstrateService: Substrate2substrateService) {}

  @Query()
  async lockRecords(
    @Args('first') first: number,
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('startTime') startTime: number
  ) {
    return this.substrate2SubstrateService.lockRecordEntities({
      first,
      sender,
      recipient,
      startTime,
    });
  }

  @Query()
  async lockRecord(@Args('id') id: string) {
    return this.substrate2SubstrateService.lockRecord(id);
  }

  @Query()
  async unlockRecord(@Args('id') id: string) {
    return this.substrate2SubstrateService.unlockRecord(id);
  }
}

@Resolver('s2sRecords')
export class S2sRecordsResolver {
  constructor(private substrate2SubstrateService: Substrate2substrateService) {}

  @Query()
  async s2sRecords(
    @Args('first') first: number,
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('startTime') startTime: number
  ) {
    return this.substrate2SubstrateService.s2sRecords({
      first,
      startTime,
      sender,
      recipient,
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
