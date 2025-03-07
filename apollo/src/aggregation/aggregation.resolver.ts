import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { isEmpty, isNull, isUndefined } from 'lodash';
import { AggregationService } from './aggregation.service';
import { Prisma } from '@prisma/client';
import { TokenInfo, TokenInfoV2 } from '../graphql';
import * as ethUtil from 'ethereumjs-util';
import Web3 from 'web3';

@Resolver()
export class AggregationResolver {
  private readonly web3 = new Web3(Web3.givenProvider);
  private readonly heartbeatTimeout = 300;
  private readonly signatureExpire = 120;
  // todo: move this to contract
  private readonly relayerProxy = {
    '0x570fca2c6f902949dbb90664be5680fec94a84f6': '0x000000000bb6a011db294ce3f3423f00eac4959e',
    '0xc5a809900b5bfb46b1b3892e419e69331b8fbc6c': '0x000000000bb6a011db294ce3f3423f00eac4959e',
    '0x3f63bce51d3c6665bfe919816780a2109d42238d': '0x000000000bb6a011db294ce3f3423f00eac4959e',
    '0x9f33a4809aa708d7a399fedba514e0a0d15efa85': '0x000000000bb6a011db294ce3f3423f00eac4959e',
    '0x9c02a1a56474247a48f1090070d2817a2a5607d9': '0x0000000cf324fed44fb52e9a519cbb5bd8217f77',
    '0x44c224d93b0f5e30b1a930d362e2bcfbb7807078': '0x0000000cf324fed44fb52e9a519cbb5bd8217f77',
    '0x3b9e571adecb0c277486036d6097e9c2cccfa9d9': '0x0b425baaf0443275d40ce854734b06e7e976387d',
    '0x2fdec62e57e1a77db6984424c01a3c13fbca7cc1': '0x00000c377b096e0c904d7736be14e653e500481c',
  };
  private invalidRelayerHeartbeat = new Map();
  private signerHeartbeatTimestamp = [];
  private safeTransactions = [];
  constructor(private aggregationService: AggregationService) {}

  private ecrecover(hash: string, sig: string): string {
    const sigObj = ethUtil.fromRpcSig(sig);
    const pubkey = ethUtil.ecrecover(
      Buffer.from(hash.substr(2), 'hex'),
      sigObj.v,
      sigObj.r,
      sigObj.s
    );
    return ethUtil.bufferToHex(ethUtil.publicToAddress(pubkey)).toLowerCase();
  }

  private standardEcrecover(hash: string, sig: string): string {
    const dataHash = this.web3.utils.soliditySha3(
      { value: '\x19Ethereum Signed Message:\n32', type: 'string' },
      { value: hash, type: 'bytes' }
    );
    return this.ecrecover(dataHash, sig);
  }

  private checkMessageSender(
    timestamp: number,
    message: string,
    relayer: string,
    sig: string
  ): boolean {
    try {
      const now = Math.floor(Date.now() / 1000);
      if (timestamp + this.signatureExpire < now) {
        return false;
      }

      const messageHash = this.web3.utils.soliditySha3(
        { value: `${timestamp}`, type: 'uint256' },
        { value: message, type: 'string' }
      );
      const signer = this.standardEcrecover(messageHash, sig);
      // cache the signer heartbeat timestamp
      if (this.relayerProxy[signer] === relayer.toLowerCase()) {
        const heartBeatSigner = this.signerHeartbeatTimestamp.find((s) => s.address === signer);
        if (heartBeatSigner) {
          heartBeatSigner.timestamp = timestamp;
        } else {
          this.signerHeartbeatTimestamp.push({
            address: signer,
            proxy: relayer.toLowerCase(),
            timestamp: timestamp,
          });
        }
      }
      return signer === relayer || this.relayerProxy[signer] === relayer;
    } catch {
      return false;
    }
  }

  @Query()
  async historyRecordById(@Args('id') id: string) {
    return this.aggregationService.queryHistoryRecordById({
      id: id,
    });
  }

  @Query()
  async previousHistoryRecord(
    @Args('fromChain') fromChain: string,
    @Args('toChain') toChain: string,
    @Args('bridge') bridge: string,
    @Args('relayer') relayer: string,
    @Args('token') token: string,
    @Args('nonce') nonce: number
  ) {
    const orderBy = { nonce: Prisma.SortOrder.desc };
    return this.aggregationService.queryHistoryRecordFirst(
      {
        AND: {
          fromChain: fromChain,
          toChain: toChain,
          bridge: bridge,
          relayer: relayer,
          sendTokenAddress: token,
          nonce: {
            lt: nonce,
          },
        },
      },
      orderBy
    );
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
    @Args('order') order: string,
    @Args('notsubmited') notsubmited: boolean
  ) {
    const orderCondition = order?.split('_');
    const orderBy =
      orderCondition && orderCondition.length == 2
        ? { [orderCondition[0]]: orderCondition[1] }
        : { startTime: Prisma.SortOrder.desc };
    const resultCondition = results && results.length ? { result: { in: results } } : {};
    const submitCondition = notsubmited ? { confirmedBlocks: { not: { contains: '0x' } } } : {};

    return this.aggregationService.queryHistoryRecordFirst(
      {
        AND: {
          fromChain: fromChain,
          toChain: toChain,
          bridge: bridge,
          relayer: relayer,
          sendTokenAddress: token,
          ...submitCondition,
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
    const relayerFilters = [{ relayer: relayer?.toLowerCase() }, { needWithdrawLiquidity }].filter(
      isValid
    );
    const accountCondition = accFilters.length ? { OR: accFilters } : {};
    const relayerCondition = relayerFilters.length ? { AND: relayerFilters } : {};
    const resultCondition = results && results.length ? { result: { in: results } } : {};
    const fromChainCondition =
      fromChains && fromChains.length ? { fromChain: { in: fromChains } } : {};
    const toChainCondition = toChains && toChains.length ? { toChain: { in: toChains } } : {};
    const bridgeCondition = bridges && bridges.length ? { bridge: { in: bridges } } : {};
    const recvTokenCondition =
      recvTokenAddress && recvTokenAddress.length
        ? { recvTokenAddress: recvTokenAddress?.toLowerCase() }
        : {};
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

  @Mutation()
  async proposeSafeTransaction(
    @Args('owner') owner: string,
    @Args('safeAddress') safeAddress: string,
    @Args('chainId') chainId: number,
    @Args('signature') signature: string,
    @Args('signatureType') signatureType: string,
    @Args('transactionHash') transactionHash: string,
    @Args('nonce') nonce: number,
    @Args('confirmationType') confirmationType: string
  ) {
    let signatureV: number = parseInt(signature.slice(-2), 16);
    if (signatureV !== 31 && signatureV !== 32) {
      return false;
    }
    signatureV -= 4;
    const normalizedSignature =
      signature.slice(0, -2) + signatureV.toString(16);

    const signer = this.standardEcrecover(transactionHash, normalizedSignature);
    if (signer !== owner.toLowerCase()) {
      return;
    }
    if (this.relayerProxy[signer] !== safeAddress.toLowerCase()) {
      return;
    }
    // only need to cache the tx
    const exist = this.safeTransactions.find(s => s.chainId === chainId && s.signature === signature && s.transactionHash === transactionHash);
    if (exist) return;
    this.safeTransactions.push({
      safeAddress,
      owner,
      chainId,
      signature,
      signatureType,
      transactionHash,
      nonce,
      confirmationType
    });

    this.safeTransactions = this.safeTransactions.filter(
      s => s.safeAddress !== safeAddress || s.chainId != chainId || s.nonce >= nonce
    );
  }

  @Mutation()
  async signConfirmedBlock(
    @Args('id') id: string,
    @Args('relayer') relayer: string,
    @Args('block') block: string,
    @Args('timestamp') timestamp: number,
    @Args('signature') signature: string
  ) {
    const allowSetConfirmed = this.checkMessageSender(
      timestamp,
      block,
      relayer?.toLowerCase(),
      signature
    );
    if (!allowSetConfirmed) {
      return;
    }
    await this.aggregationService.updateConfirmedBlock({
      where: { id: id },
      block: block,
    });
  }

  @Mutation()
  async signHeartBeat(
    @Args('fromChainId') fromChainId: string,
    @Args('toChainId') toChainId: string,
    @Args('version') version: string,
    @Args('relayer') relayer: string,
    @Args('tokenAddress') tokenAddress: string,
    @Args('softTransferLimit') softTransferLimit: string,
    @Args('timestamp') timestamp: number,
    @Args('signature') signature: string
  ) {
    const id = `${version}-${fromChainId}-${toChainId}-${relayer?.toLowerCase()}-${tokenAddress?.toLowerCase()}`;
    const now = Math.floor(Date.now() / 1000);

    const allowHeartBeat = this.checkMessageSender(
      timestamp,
      softTransferLimit,
      relayer?.toLowerCase(),
      signature
    );
    if (!allowHeartBeat) {
      return;
    }

    const updateData = {
      heartbeatTimestamp: now,
    };

    if (softTransferLimit !== undefined && softTransferLimit !== '0') {
      // the softTransferLimit is on target chain, transfer it to source chain
      const transferLimit = this.aggregationService.targetAmountToSourceAmount({
        amount: softTransferLimit,
        sourceChainId: Number(fromChainId),
        targetChainId: Number(toChainId),
        sourceToken: tokenAddress,
        version,
      });
      updateData['softTransferLimit'] = transferLimit;
    }

    try {
      await this.aggregationService.updateLnBridgeRelayInfo({
        where: { id: id },
        data: updateData,
      });
    } catch (e) {
      const saved = this.invalidRelayerHeartbeat.get(id);
      if (!saved) {
        console.log(`heart beat failed ${id}, exception: ${e}`);
        this.invalidRelayerHeartbeat.set(id, true);
      }
    }
  }

  @Mutation()
  async signDynamicFee(
    @Args('fromChainId') fromChainId: string,
    @Args('toChainId') toChainId: string,
    @Args('version') version: string,
    @Args('relayer') relayer: string,
    @Args('tokenAddress') tokenAddress: string,
    @Args('dynamicFee') dynamicFee: string,
    @Args('dynamicFeeExpire') dynamicFeeExpire: string,
    @Args('dynamicFeeSignature') dynamicFeeSignature: string,
    @Args('timestamp') timestamp: number,
    @Args('signature') signature: string
  ) {
    const id = `${version}-${fromChainId}-${toChainId}-${relayer?.toLowerCase()}-${tokenAddress?.toLowerCase()}`;
    const message = `${dynamicFee}:${dynamicFeeExpire}:${dynamicFeeSignature}`;
    const allowSetDynamicFee = this.checkMessageSender(
      timestamp,
      message,
      relayer?.toLowerCase(),
      signature
    );
    if (!allowSetDynamicFee) {
      return;
    }

    try {
      await this.aggregationService.updateLnBridgeRelayInfo({
        where: { id: id },
        data: {
          dynamicFee,
          dynamicFeeExpire,
          dynamicFeeSignature,
        },
      });
    } catch (e) {
      return;
    }
  }

  @Query()
  getTransactionConfirmations(
    @Args('safeTxHash') safeTxHash: string
  ) {
    return this.safeTransactions.filter(
      s => s.transactionHash === safeTxHash
    ).map(
      s => {
        return {
          owner: s.owner,
          signature: s.signature,
          signatureType: s.signatureType,
          transactionHash: s.transactionHash,
          confirmationType: s.confirmationType,
        };
      }
    );
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
  tasksHealthCheck(@Args('name') name: string) {
    const healthChecks = this.aggregationService.tasksHealthCheck();
    if (name) {
      return [
        {
          name: name,
          callTimes: healthChecks.get(name),
        },
      ];
    }
    return Array.from(healthChecks, ([name, callTimes]) => ({ name, callTimes }));
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
    for (const record of records.records) {
      const signers = this.signerHeartbeatTimestamp.filter(
        (s) => s.proxy === record.relayer.toLowerCase()
      );
      if (signers.length > 0) {
        record.signers = signers.map((s) => `${s.address}-${s.timestamp}`).join(',');
      }
    }
    return records;
  }

  @Query()
  async queryLnBridgeSupportChains(@Args('tokenKey') tokenKey: string) {
    const tokens = await this.queryLnBridgeSupportedChains(tokenKey);
    return tokens?.find((e) => e.tokenKey === tokenKey)?.chains;
  }

  @Query()
  async queryLnBridgeSupportedChains(@Args('tokenKey') tokenKey: string) {
    const baseFilters = {
      paused: false,
      OR: [{ transferLimit: { not: '0' } }, { margin: { not: '0' } }],
    };
    if (tokenKey.length > 0) {
      baseFilters['tokenKey'] = tokenKey;
    }

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnBridgeRelayInfos({
      where,
    });

    const now = Math.floor(Date.now() / 1000);
    return records.records.reduce((result, record) => {
      if (record.heartbeatTimestamp + this.heartbeatTimeout < now) {
        return result;
      }

      let token = result.find((e) => e.tokenKey === record.tokenKey);
      if (!token) {
        token = { tokenKey: record.tokenKey, chains: [] };
        result.push(token);
      }

      let chain = token.chains.find((chain) => chain.fromChain === record.fromChain);
      if (!chain) {
        chain = { fromChain: record.fromChain, toChains: [] };
        token.chains.push(chain);
      }

      if (!chain.toChains.includes(record.toChain)) {
        chain.toChains.push(record.toChain);
      }
      return result;
    }, [] as TokenInfo[]);
  }

  @Query()
  async queryLnBridgeSupportedChainsV2(@Args('tokenKey') tokenKey: string) {
    const baseFilters = {
      paused: false,
      OR: [{ transferLimit: { not: '0' } }, { margin: { not: '0' } }],
    };
    if (tokenKey.length > 0) {
      baseFilters['tokenKey'] = tokenKey;
    }

    const where = {
      ...baseFilters,
    };

    const records = await this.aggregationService.queryLnBridgeRelayInfos({
      where,
    });

    const now = Math.floor(Date.now() / 1000);
    return records.records.reduce((result, record) => {
      if (record.heartbeatTimestamp + this.heartbeatTimeout < now) {
        return result;
      }

      let token = result.find((e) => e.tokenKey === record.tokenKey);
      if (!token) {
        token = { tokenKey: record.tokenKey, chains: [] };
        result.push(token);
      }

      let chain = token.chains.find((chain) => chain.from.chain === record.fromChain);
      if (!chain) {
        chain = { from: { chain: record.fromChain, token: record.sendToken }, toChains: [] };
        token.chains.push(chain);
      }

      let toChain = chain.toChains.find((c) => c.chain === record.toChain);
      if (!toChain) {
        chain.toChains.push({ chain: record.toChain, token: record.recvToken });
      }
      return result;
    }, [] as TokenInfoV2[]);
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
    const sortedRelayers = [];
    let transferLimit = BigInt(0);
    const now = Math.floor(Date.now() / 1000);
    for (const record of records.records) {
      let limit = record.version == 'lnv2' ? BigInt(record.margin) : BigInt(record.transferLimit);
      try {
        const softTransferLimit = BigInt(record.softTransferLimit);
        if (limit > softTransferLimit && softTransferLimit > 0) {
          limit = softTransferLimit;
        }
      } catch (e) {
        console.log(`get softTransferLimit failed ${record.id}, exception: ${e}`);
        continue;
      }
      // offline
      if (record.heartbeatTimestamp + this.heartbeatTimeout < now) {
        continue;
      }

      if (limit > transferLimit) {
        transferLimit = limit;
      }
      const providerFee =
        (BigInt(amount) * BigInt(record.liquidityFeeRate)) / BigInt(100000) +
        BigInt(record.baseFee);
      if (limit < BigInt(amount) + providerFee + BigInt(record.protocolFee) || record.paused) {
        continue;
      }
      const point = await this.aggregationService.calculateLnBridgeRelayerPoint(
        sendToken,
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
    @Args('balance') balance: string
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
    let maxTransferAmount = BigInt(0);
    const now = Math.floor(Date.now() / 1000);
    const liquidityFeeScale = BigInt(100000);
    for (const record of records.records) {
      // offline
      if (record.heartbeatTimestamp + this.heartbeatTimeout < now || record.paused) {
        continue;
      }

      const fixFee = BigInt(record.baseFee) + BigInt(record.protocolFee);
      const userBalanceRestrict =
        ((BigInt(balance) - fixFee) * liquidityFeeScale) /
        (liquidityFeeScale + BigInt(record.liquidityFeeRate));
      let limitRestrict =
        record.version === 'lnv2'
          ? ((BigInt(record.margin) - fixFee) * liquidityFeeScale) /
            (liquidityFeeScale + BigInt(record.liquidityFeeRate))
          : BigInt(record.transferLimit);

      try {
        const softTransferLimit = BigInt(record.softTransferLimit);
        if (limitRestrict > softTransferLimit && softTransferLimit > 0) {
          limitRestrict = softTransferLimit;
        }
      } catch (e) {
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
