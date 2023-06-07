
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

    abstract queryDailyStatistics(timepast: number, first?: Nullable<number>, from?: Nullable<string>, to?: Nullable<string>, bridge?: Nullable<string>, token?: Nullable<string>): Nullable<Nullable<DailyStatistics>[]> | Promise<Nullable<Nullable<DailyStatistics>[]>>;

    abstract historyRecords(sender?: Nullable<string>, recipient?: Nullable<string>, fromChains?: Nullable<Nullable<string>[]>, toChains?: Nullable<Nullable<string>[]>, bridges?: Nullable<Nullable<string>[]>, row?: Nullable<number>, page?: Nullable<number>, results?: Nullable<Nullable<number>[]>, recvTokenAddress?: Nullable<string>, order?: Nullable<string>): Nullable<HistoryRecords> | Promise<Nullable<HistoryRecords>>;

    abstract queryGuardNeedSignature(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, guardAddress?: Nullable<string>, row?: Nullable<number>): Nullable<HistoryRecords> | Promise<Nullable<HistoryRecords>>;

    abstract queryRelayRecords(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, relayer?: Nullable<string>, row?: Nullable<number>): Nullable<HistoryRecords> | Promise<Nullable<HistoryRecords>>;

    abstract queryLnv20RelayInfos(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, row?: Nullable<number>, page?: Nullable<number>): Nullable<Lnv20RelayInfos> | Promise<Nullable<Lnv20RelayInfos>>;

    abstract sortedLnv20RelayInfos(fromChain?: Nullable<string>, toChain?: Nullable<string>, bridge?: Nullable<string>, row?: Nullable<number>, amount?: Nullable<BigInt>, decimals?: Nullable<BigInt>): Nullable<Nullable<Lnv20RelayInfo>[]> | Promise<Nullable<Nullable<Lnv20RelayInfo>[]>>;
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
    guardSignatures?: Nullable<string>;
    relayer?: Nullable<string>;
    endTxHash?: Nullable<string>;
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

export class Lnv20RelayInfo {
    id: string;
    fromChain: string;
    toChain: string;
    bridge: string;
    nonce: BigInt;
    relayer: string;
    transaction_hash: string;
    timestamp: number;
    providerKey: string;
    margin?: Nullable<string>;
    baseFee?: Nullable<string>;
    liquidityFeeRate?: Nullable<number>;
    refundCount?: Nullable<number>;
}

export class Lnv20RelayInfos {
    total: number;
    records?: Nullable<Nullable<Lnv20RelayInfo>[]>;
}

export abstract class IMutation {
    abstract addGuardSignature(id?: Nullable<string>, dataHash?: Nullable<string>, signature?: Nullable<string>): Nullable<string> | Promise<Nullable<string>>;
}

export type BigInt = any;
type Nullable<T> = T | null;
