import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { isEmpty, isNull, isUndefined } from 'lodash';
import { AggregationService } from './aggregation.service';
import { Prisma } from '@prisma/client';

@Resolver()
export class AggregationResolver {
  private readonly heartbeatTimeout = 300;
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
    @Args('relayer') relayer: string,
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
          relayer: relayer,
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
    @Args('relayer') relayer: string,
    @Args('needWithdrawLiquidity') needWithdrawLiquidity: boolean,
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

    const accFilters = [{ sender: sender?.toLowerCase() }, { recipient }].filter(isValid);
    const relayerFilters = [{ relayer: relayer?.toLowerCase() }, { needWithdrawLiquidity }].filter(isValid); 
    const accountCondition = accFilters.length ? { OR: accFilters } : {};
    const relayerCondition = relayerFilters.length ? { AND: relayerFilters } : {};
    const resultCondition = results && results.length ? { result: { in: results } } : {};
    const fromChainCondition =
      fromChains && fromChains.length ? { fromChain: { in: fromChains } } : {};
    const toChainCondition = toChains && toChains.length ? { toChain: { in: toChains } } : {};
    const bridgeCondition = bridges && bridges.length ? { bridge: { in: bridges } } : {};
    const recvTokenCondition =
      recvTokenAddress && recvTokenAddress.length ? { recvTokenAddress: recvTokenAddress?.toLowerCase() } : {};
    const chainConditions = {
      AND: {
        ...resultCondition,
        ...fromChainCondition,
        ...toChainCondition,
        ...bridgeCondition,
        ...recvTokenCondition,
        ...relayerCondition,
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
    @Args('version') version: string,
    @Args('relayer') relayer: string,
    @Args('tokenAddress') tokenAddress: string,
    @Args('softTransferLimit') softTransferLimit: string
  ) {
    const id = `${version}-${fromChainId}-${toChainId}-${relayer.toLowerCase()}-${tokenAddress.toLowerCase()}`;
    let updateData = {
      heartbeatTimestamp: Math.floor(Date.now() / 1000),
    };
    if (softTransferLimit !== undefined && softTransferLimit !== '0') {
      updateData['softTransferLimit'] = softTransferLimit;
    }

    try {
      await this.aggregationService.updateLnBridgeRelayInfo({
        where: { id: id },
        data: updateData,
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
    @Args('toToken') toToken: string,
    @Args('version') version: string
  ) {
    return this.aggregationService.checkLnBridgeConfigure({
      sourceChainId: fromChainId,
      targetChainId: toChainId,
      sourceToken: fromToken,
      targetToken: toToken,
      version: version,
    });
  }

  @Query()
  tasksHealthCheck(
    @Args('name') name: string
  ) {
     const healthChecks = this.aggregationService.tasksHealthCheck();
     if (name !== null) {
       return [
         {
           name: name,
           callTimes: healthChecks[name]
         }
       ];
     }
     return Array.from(healthChecks, ([name, callTimes]) => ({ name, callTimes }));
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
  async queryLnBridgeRelayInfos(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('version') version: string,
    @Args('bridge') bridge: string,
    @Args('relayer') relayer: string,
    @Args('row') row: number,
    @Args('page') page: number
  ) {
    const skip = row * page || 0;
    const take = row || 10;
    const baseFilters = { fromChain, toChain, bridge, relayer, version };

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnBridgeRelayInfos({
      skip,
      take,
      where,
    });
    return records;
  }

  @Query()
  async queryLnBridgeSupportChains(
    @Args('tokenKey') tokenKey: string
  ) {
    const baseFilters = { 
        tokenKey,
        paused: false,
        OR: [{transferLimit: { not: '0' }}, {margin: { not: '0' }}]
    };

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnBridgeRelayInfos({
      where,
    });
    let supportChains = new Map();
    const now = Math.floor(Date.now() / 1000);
    for (const record of records.records) {
        if (record.heartbeatTimestamp + this.heartbeatTimeout < now) {
          continue;
        }

        let toChains = supportChains.get(record.fromChain);

        if (!toChains) {
            supportChains.set(record.fromChain, [ record.toChain ]);
        } else {
            if (!toChains.includes(record.toChain)) {
                toChains.push(record.toChain);
            }
        }
    }
    return Array.from(supportChains, ([fromChain, toChains]) => ({
        fromChain,
        toChains,
    }));
  }

  @Query()
  async sortedLnBridgeRelayInfos(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('version') version: string,
    @Args('bridge') bridge: string,
    @Args('token') token: string,
    @Args('row') row: number,
    @Args('amount') amount: string,
    @Args('decimals') decimals: number
  ) {
    const take = row || 128;
    const sendToken = token?.toLowerCase();
    const baseFilters = { fromChain, toChain, sendToken, bridge, version };
    amount = amount ?? '0';
    decimals = decimals ?? 18;

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnBridgeRelayInfos({
      skip: 0,
      take,
      where,
    });
    // w=P * 0.5 + max(R - S*0.001, 0) * 0.1 + max(1-T_0 * 0.001, 0)*0.1 + T_1 * 0.2
    //const validRecords = records.records.filter((record) => BigInt(record.margin) > BigInt(amount));
    // query all pending txs
    var sortedRelayers = [];
    var transferLimit = BigInt(0);
    const now = Math.floor(Date.now() / 1000);
    for (const record of records.records) {
      let limit = record.version == 'lnv2' ? BigInt(record.margin) : BigInt(record.transferLimit);
      try {
          const softTransferLimit = BigInt(record.softTransferLimit);
          if (limit > softTransferLimit && softTransferLimit > 0) {
              limit = softTransferLimit;
          }
      } catch(e) {
          console.log(`get softTransferLimit failed ${record.id}, exception: ${e}`);
          continue;
      }
      const providerFee = BigInt(amount) * BigInt(record.liquidityFeeRate) / BigInt(100000) + BigInt(record.baseFee);
      if (limit < BigInt(amount) + providerFee + BigInt(record.protocolFee) || record.paused) {
        continue;
      }
      // offline
      if (record.heartbeatTimestamp + this.heartbeatTimeout < now) {
        continue;
      }
      const point = await this.aggregationService.calculateLnBridgeRelayerPoint(
        token,
        BigInt(amount),
        decimals,
        record
      );
      if (point == null) {
        continue;
      }
      if (limit > transferLimit) {
        transferLimit = limit;
      }
      sortedRelayers.push({ record, point });
    }
    return {
      transferLimit: transferLimit,
      records: sortedRelayers.sort((l, r) => l.point - r.point).map((item) => item.record),
    };
  }

  /**
   * For one relayer
   * userBalance, transferLimitV2(margin), transferLimitV3 baseFee, liquidityFeeRate, protocolFee
   * suppose user transfer amount is X
   * then totalFee = X * liquidityFeeRate / 100000 + baseFee + protocolFee
   * 1. totalFee + X <= userBalance          => X <= (userBalance - baseFee - protocolFee)/(1 + liquidityFeeRate / 100000)
   * 2. V2: totalFee + X <= transferLimitV2  => X <= (transferLimitV2 - baseFee - protocolFee)/(1 + liquidityFeeRate / 100000)
   * 3. V3: X <= transferLimitV3             => X <= transferLimitV3
   */
  @Query()
  async queryMaxTransfer(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('bridge') bridge: string,
    @Args('token') token: string,
    @Args('balance') balance: string,
  ) {
    const sendToken = token?.toLowerCase();
    const baseFilters = { fromChain, toChain, sendToken, bridge };

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnBridgeRelayInfos({
      skip: 0,
      where,
    });
    var maxTransferAmount = BigInt(0);
    const now = Math.floor(Date.now() / 1000);
    const liquidityFeeScale = BigInt(100000);
    for (const record of records.records) {
      // offline
      if (record.heartbeatTimestamp + this.heartbeatTimeout < now || record.paused) {
        continue;
      }

      const fixFee = BigInt(record.baseFee) + BigInt(record.protocolFee);
      const userBalanceRestrict = (BigInt(balance) - fixFee) * liquidityFeeScale / (liquidityFeeScale + BigInt(record.liquidityFeeRate));
      let limitRestrict = record.version === 'lnv2' ?
          (BigInt(record.margin) - fixFee) * liquidityFeeScale / (liquidityFeeScale + BigInt(record.liquidityFeeRate)) :
          BigInt(record.transferLimit);

      try {
          const softTransferLimit = BigInt(record.softTransferLimit);
          if (limitRestrict > softTransferLimit && softTransferLimit > 0) {
              limitRestrict = softTransferLimit;
          }
      } catch(e) {
          console.log(`get softTransferLimit failed ${record.id}, exception: ${e}`);
          continue;
      }

      const limit = limitRestrict < userBalanceRestrict ? limitRestrict : userBalanceRestrict;
      if (maxTransferAmount < limit) {
          maxTransferAmount = limit;
      }
    }
    return maxTransferAmount;
  }
}
