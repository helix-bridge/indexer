import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { isEmpty, isNull, isUndefined } from 'lodash';
import { AggregationService } from './aggregation.service';
import { Prisma } from '@prisma/client';

@Resolver()
export class AggregationResolver {
  constructor(private aggregationService: AggregationService) {}

  @Query()
  async historyRecordById(@Args('id') id: string) {
    return this.aggregationService.queryHistoryRecordById({
      id: id,
    });
  }

  // query by source tx hash
  @Query()
  async historyRecordByTxHash(@Args('txHash') txHash: string) {
    return this.aggregationService.queryHistoryRecordFirst({
      requestTxHash: txHash,
    });
  }

  @Query()
  async firstHistoryRecord(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('bridge') bridge: string,
    @Args('results') results: number[],
    @Args('provider') provider: string,
    @Args('token') token: string,
    @Args('order') order: string
  ) {
    const orderCondition = order?.split('_');
    const orderBy =
      orderCondition && orderCondition.length == 2
        ? { [orderCondition[0]]: orderCondition[1] }
        : { startTime: Prisma.SortOrder.desc };
    const resultCondition = results && results.length ? { result: { in: results } } : {};
    return this.aggregationService.queryHistoryRecordFirst(
      {
        AND: {
          fromChain: fromChain,
          toChain: toChain,
          bridge: bridge,
          relayer: provider,
          sendTokenAddress: token,
          ...resultCondition,
        },
      },
      orderBy
    );
  }

  @Query()
  async historyRecords(
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('fromChains') fromChains: string[],
    @Args('toChains') toChains: string[],
    @Args('bridges') bridges: string,
    @Args('row') row: number,
    @Args('page') page: number,
    @Args('results') results: number[],
    @Args('recvTokenAddress') recvTokenAddress: string,
    @Args('order') order: string
  ) {
    const orderCondition = order?.split('_');
    const skip = row * page || 0;
    const take = row || 10;
    const orderBy =
      orderCondition && orderCondition.length == 2
        ? { [orderCondition[0]]: orderCondition[1] }
        : { startTime: Prisma.SortOrder.desc };
    const isValid = (item) =>
      !Object.values(item).some((value) => isUndefined(value) || isNull(value) || value === '');

    const accFilters = [{ sender }, { recipient }].filter(isValid);
    const accountCondition = accFilters.length ? { OR: accFilters } : {};
    const resultCondition = results && results.length ? { result: { in: results } } : {};
    const fromChainCondition =
      fromChains && fromChains.length ? { fromChain: { in: fromChains } } : {};
    const toChainCondition = toChains && toChains.length ? { toChain: { in: toChains } } : {};
    const bridgeCondition = bridges && bridges.length ? { bridge: { in: bridges } } : {};
    const recvTokenCondition =
      recvTokenAddress && recvTokenAddress.length ? { recvTokenAddress: recvTokenAddress } : {};
    const chainConditions = {
      AND: {
        ...resultCondition,
        ...fromChainCondition,
        ...toChainCondition,
        ...bridgeCondition,
        ...recvTokenCondition,
      },
    };

    const conditions = {
      ...accountCondition,
      ...chainConditions,
    };

    const where = isEmpty(conditions) ? undefined : conditions;

    return this.aggregationService.queryHistoryRecords({
      skip,
      take,
      where,
      orderBy,
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

  @Mutation()
  async updateConfirmedBlock(@Args('id') id: string, @Args('block') block: string) {
    await this.aggregationService.updateConfirmedBlock({
      where: { id: id },
      block: block,
    });
  }

  @Mutation()
  async lnBridgeHeartBeat(
    @Args('fromChainId') fromChainId: string,
    @Args('toChainId') toChainId: string,
    @Args('relayer') relayer: string,
    @Args('tokenAddress') tokenAddress: string
  ) {
    const id = `lnv20-${fromChainId}-${toChainId}-${relayer.toLowerCase()}-${tokenAddress.toLowerCase()}`;
    try {
      await this.aggregationService.updateLnv20RelayInfo({
        where: { id: id },
        data: {
          heartbeatTimestamp: Math.floor(Date.now() / 1000),
        },
      });
    } catch (e) {
      console.log(`heart beat failed ${id}, exception: ${e}`);
      return;
    }
  }

  @Query()
  checkLnBridgeExist(
    @Args('fromChainId') fromChainId: number,
    @Args('toChainId') toChainId: number,
    @Args('fromToken') fromToken: string,
    @Args('toToken') toToken: string
  ) {
    return this.aggregationService.checkLnBridgeConfigure({
      sourceChainId: fromChainId,
      targetChainId: toChainId,
      sourceToken: fromToken,
      targetToken: toToken,
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

  @Query()
  async queryRelayRecords(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('bridge') bridge: string,
    @Args('relayer') relayer: string,
    @Args('row') row: number
  ) {
    const take = row || 16;
    const baseFilters = { fromChain, toChain, bridge, relayer };
    const filterWithdrawn = { endTxHash: '' };

    const where = {
      ...baseFilters,
      ...filterWithdrawn,
    };

    return this.aggregationService.queryHistoryRecords({
      skip: 0,
      take,
      where,
    });
  }

  @Query()
  async queryLnv20RelayInfos(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('bridge') bridge: string,
    @Args('relayer') relayer: string,
    @Args('row') row: number,
    @Args('page') page: number
  ) {
    const skip = row * page || 0;
    const take = row || 10;
    const baseFilters = { fromChain, toChain, bridge, relayer };

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnv20RelayInfos({
      skip,
      take,
      where,
    });
    return records;
  }

  @Query()
  async sortedLnv20RelayInfos(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('bridge') bridge: string,
    @Args('token') token: string,
    @Args('row') row: number,
    @Args('amount') amount: string,
    @Args('decimals') decimals: number
  ) {
    const take = row || 128;
    const sendToken = token?.toLowerCase();
    const baseFilters = { fromChain, toChain, sendToken, bridge };

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnv20RelayInfos({
      skip: 0,
      take,
      where,
    });
    // w=P * 0.5 + max(R - S*0.001, 0) * 0.1 + max(1-T_0 * 0.001, 0)*0.1 + T_1 * 0.2
    //const validRecords = records.records.filter((record) => BigInt(record.margin) > BigInt(amount));
    // query all pending txs
    var sortedRelayers = [];
    var maxMargin = BigInt(0);
    for (const record of records.records) {
      const margin = BigInt(record.margin);
      if (margin > maxMargin) {
        maxMargin = margin;
      }
      if (margin < BigInt(amount)) {
        continue;
      }
      const point = await this.aggregationService.calculateLnv20RelayerPoint(
        token,
        BigInt(amount),
        decimals,
        record
      );
      if (point == null) {
        continue;
      }
      sortedRelayers.push({ record, point });
    }
    return {
      maxMargin: maxMargin,
      records: sortedRelayers.sort((l, r) => l.point - r.point).map((item) => item.record),
    };
  }
}
