
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export class Accounts {
    total: number;
}

export abstract class IQuery {
    abstract accounts(chain?: Nullable<string>): Nullable<Accounts> | Promise<Nullable<Accounts>>;

    abstract historyRecordById(id?: Nullable<string>): Nullable<HistoryRecord> | Promise<Nullable<HistoryRecord>>;

    abstract historyRecordByTxHash(txHash?: Nullable<string>): Nullable<HistoryRecord> | Promise<Nullable<HistoryRecord>>;

    abstract firstHistoryRecord(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, results?: Nullable<Nullable<number>[]>, relayer?: Nullable<string>, token?: Nullable<string>, order?: Nullable<string>, notsubmited?: Nullable<boolean>): Nullable<HistoryRecord> | Promise<Nullable<HistoryRecord>>;

    abstract queryDailyStatistics(timepast: number, first?: Nullable<number>, from?: Nullable<string>, to?: Nullable<string>, bridge?: Nullable<string>, token?: Nullable<string>): Nullable<Nullable<DailyStatistics>[]> | Promise<Nullable<Nullable<DailyStatistics>[]>>;

    abstract historyRecords(sender?: Nullable<string>, recipient?: Nullable<string>, relayer?: Nullable<string>, needWithdrawLiquidity?: Nullable<boolean>, fromChains?: Nullable<Nullable<string>[]>, toChains?: Nullable<Nullable<string>[]>, bridges?: Nullable<Nullable<string>[]>, row?: Nullable<number>, page?: Nullable<number>, results?: Nullable<Nullable<number>[]>, recvTokenAddress?: Nullable<string>, order?: Nullable<string>): Nullable<HistoryRecords> | Promise<Nullable<HistoryRecords>>;

    abstract checkLnBridgeExist(fromChainId?: Nullable<number>, toChainId?: Nullable<number>, fromToken?: Nullable<string>, toToken?: Nullable<string>, version?: Nullable<string>): Nullable<boolean> | Promise<Nullable<boolean>>;

    abstract tasksHealthCheck(name?: Nullable<string>): Nullable<Nullable<HealthInfo>[]> | Promise<Nullable<Nullable<HealthInfo>[]>>;

    abstract queryGuardNeedSignature(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, guardAddress?: Nullable<string>, row?: Nullable<number>): Nullable<HistoryRecords> | Promise<Nullable<HistoryRecords>>;

    abstract queryRelayRecords(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, relayer?: Nullable<string>, row?: Nullable<number>): Nullable<HistoryRecords> | Promise<Nullable<HistoryRecords>>;

    abstract queryLnBridgeRelayInfos(fromChain?: Nullable<string>, toChain?: Nullable<string>, version?: Nullable<string>, bridge?: Nullable<string>, relayer?: Nullable<string>, row?: Nullable<number>, page?: Nullable<number>): Nullable<LnBridgeRelayInfos> | Promise<Nullable<LnBridgeRelayInfos>>;

    abstract sortedLnBridgeRelayInfos(fromChain?: Nullable<string>, toChain?: Nullable<string>, version?: Nullable<string>, bridge?: Nullable<string>, token?: Nullable<string>, row?: Nullable<number>, amount?: Nullable<string>, decimals?: Nullable<number>): Nullable<SortedLnBridgeRelayInfos> | Promise<Nullable<SortedLnBridgeRelayInfos>>;

    abstract queryLnBridgeSupportChains(tokenKey?: Nullable<string>): Nullable<Nullable<SupportChains>[]> | Promise<Nullable<Nullable<SupportChains>[]>>;

    abstract queryMaxTransfer(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, token?: Nullable<string>, balance?: Nullable<string>): Nullable<BigInt> | Promise<Nullable<BigInt>>;
}

export class HistoryRecord {
    id: string;
    fromChain: string;
    toChain: string;
    bridge: string;
    reason?: Nullable<string>;
    nonce: BigInt;
    requestTxHash: string;
    responseTxHash?: Nullable<string>;
    sender: string;
    recipient: string;
    sendToken: string;
    recvToken: string;
    sendAmount: string;
    recvAmount?: Nullable<string>;
    startTime: number;
    endTime?: Nullable<number>;
    result: number;
    fee: string;
    feeToken: string;
    messageNonce?: Nullable<string>;
    sendTokenAddress?: Nullable<string>;
    recvTokenAddress?: Nullable<string>;
    sendOuterTokenAddress?: Nullable<string>;
    recvOuterTokenAddress?: Nullable<string>;
    guardSignatures?: Nullable<string>;
    relayer?: Nullable<string>;
    endTxHash?: Nullable<string>;
    confirmedBlocks?: Nullable<string>;
    needWithdrawLiquidity?: Nullable<boolean>;
    lastRequestWithdraw?: Nullable<BigInt>;
    extData?: Nullable<string>;
}

export class DailyStatistics {
    fromChain: string;
    toChain: string;
    bridge: string;
    timestamp: number;
    token: string;
    dailyVolume?: Nullable<BigInt>;
    dailyCount?: Nullable<BigInt>;
}

export class HistoryRecords {
    total: number;
    records?: Nullable<Nullable<HistoryRecord>[]>;
}

export class LnBridgeRelayInfo {
    id: string;
    version: string;
    nonce: BigInt;
    targetNonce?: Nullable<BigInt>;
    fromChain: string;
    toChain: string;
    bridge: string;
    relayer: string;
    sendToken?: Nullable<string>;
    tokenKey?: Nullable<string>;
    transactionHash: string;
    timestamp: number;
    margin?: Nullable<string>;
    protocolFee?: Nullable<string>;
    baseFee?: Nullable<string>;
    liquidityFeeRate?: Nullable<number>;
    slashCount?: Nullable<number>;
    withdrawNonce?: Nullable<BigInt>;
    lastTransferId?: Nullable<string>;
    cost?: Nullable<string>;
    profit?: Nullable<string>;
    heartbeatTimestamp?: Nullable<number>;
    messageChannel?: Nullable<string>;
    transferLimit?: Nullable<string>;
    softTransferLimit?: Nullable<string>;
    paused?: Nullable<boolean>;
    dynamicFee?: Nullable<string>;
    dynamicFeeExpire?: Nullable<string>;
    dynamicFeeSignature?: Nullable<string>;
}

export class LnBridgeRelayInfos {
    total: number;
    records?: Nullable<Nullable<LnBridgeRelayInfo>[]>;
}

export class SortedLnBridgeRelayInfos {
    transferLimit: BigInt;
    records?: Nullable<Nullable<LnBridgeRelayInfo>[]>;
}

export class SupportChains {
    fromChain: string;
    toChains?: Nullable<Nullable<string>[]>;
}

export class HealthInfo {
    name?: Nullable<string>;
    callTimes?: Nullable<number>;
}

export abstract class IMutation {
    abstract addGuardSignature(id?: Nullable<string>, dataHash?: Nullable<string>, signature?: Nullable<string>): Nullable<string> | Promise<Nullable<string>>;

    abstract updateConfirmedBlock(id?: Nullable<string>, block?: Nullable<string>): Nullable<string> | Promise<Nullable<string>>;

    abstract lnBridgeHeartBeat(fromChainId?: Nullable<string>, toChainId?: Nullable<string>, version?: Nullable<string>, relayer?: Nullable<string>, tokenAddress?: Nullable<string>, softTransferLimit?: Nullable<string>): Nullable<string> | Promise<Nullable<string>>;

    abstract signConfirmedBlock(id?: Nullable<string>, block?: Nullable<string>, timestamp?: Nullable<number>, signature?: Nullable<string>): Nullable<string> | Promise<Nullable<string>>;

    abstract signHeartBeat(fromChainId?: Nullable<string>, toChainId?: Nullable<string>, version?: Nullable<string>, relayer?: Nullable<string>, tokenAddress?: Nullable<string>, softTransferLimit?: Nullable<string>, timestamp?: Nullable<number>, signature?: Nullable<string>): Nullable<string> | Promise<Nullable<string>>;

    abstract signDynamicFee(fromChainId?: Nullable<string>, toChainId?: Nullable<string>, version?: Nullable<string>, relayer?: Nullable<string>, tokenAddress?: Nullable<string>, dynamicFee?: Nullable<string>, dynamicFeeExpire?: Nullable<string>, dynamicFeeSignature?: Nullable<string>, timestamp?: Nullable<number>, signature?: Nullable<string>): Nullable<string> | Promise<Nullable<string>>;
}

export type BigInt = any;
type Nullable<T> = T | null;
