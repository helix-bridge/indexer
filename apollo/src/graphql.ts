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

    abstract historyRecords(sender?: Nullable<string>, recipient?: Nullable<string>, row?: Nullable<number>, page?: Nullable<number>): Nullable<Nullable<HistoryRecord>[]> | Promise<Nullable<Nullable<HistoryRecord>[]>>;

    abstract queryDailyStatistics(timepast: number, first?: Nullable<number>, from?: Nullable<string>, to?: Nullable<string>, bridge?: Nullable<string>, token?: Nullable<string>): Nullable<Nullable<DailyStatistics>[]> | Promise<Nullable<Nullable<DailyStatistics>[]>>;

    abstract burnRecords(first?: Nullable<number>, startTime?: Nullable<number>, sender?: Nullable<string>, recipient?: Nullable<string>): Nullable<Nullable<BurnRecordEntity>[]> | Promise<Nullable<Nullable<BurnRecordEntity>[]>>;

    abstract burnRecord(id: string): Nullable<S2sRecord> | Promise<Nullable<S2sRecord>>;

    abstract dvmLockRecord(id: string): Nullable<DVMLockRecord> | Promise<Nullable<DVMLockRecord>>;

    abstract lockRecords(first?: Nullable<number>, startTime?: Nullable<number>, sender?: Nullable<string>, recipient?: Nullable<string>): Nullable<Nullable<S2sEvent>[]> | Promise<Nullable<Nullable<S2sEvent>[]>>;

    abstract lockRecord(id: string): Nullable<S2sRecord> | Promise<Nullable<S2sRecord>>;

    abstract unlockRecord(id: string): Nullable<UnlockRecord> | Promise<Nullable<UnlockRecord>>;

    abstract s2sRecords(first?: Nullable<number>, startTime?: Nullable<number>, sender?: Nullable<string>, recipient?: Nullable<string>): Nullable<Nullable<S2sRecord>[]> | Promise<Nullable<Nullable<S2sRecord>[]>>;

    abstract dailyStatistics(first?: Nullable<number>, timepast?: Nullable<number>, chain?: Nullable<string>): Nullable<Nullable<DailyStatistic>[]> | Promise<Nullable<Nullable<DailyStatistic>[]>>;
}

export class HistoryRecord {
    id: string;
    fromChain: string;
    toChain: string;
    bridge: string;
    laneId: string;
    nonce: string;
    requestTxHash: string;
    responseTxHash?: Nullable<string>;
    sender: string;
    recipient: string;
    token: string;
    amount: string;
    startTime: number;
    endTime?: Nullable<number>;
    result: number;
    fee: string;
}

export class DailyStatistics {
    fromChain: string;
    toChain: string;
    Direction: string;
    bridge: string;
    timestamp: number;
    token: string;
    dailyVolume?: Nullable<BigInt>;
    dailyCount?: Nullable<BigInt>;
}

export class S2sEvent {
    id: string;
    laneId: string;
    nonce: string;
    requestTxHash: string;
    responseTxHash?: Nullable<string>;
    senderId: string;
    result: number;
    recipient: string;
    token: string;
    amount: string;
    startTimestamp: string;
    endTimestamp?: Nullable<string>;
    fee: string;
}

export class DailyStatistic {
    id: string;
    dailyVolume?: Nullable<BigInt>;
    dailyCount?: Nullable<number>;
}

export class BurnRecordEntity {
    id: string;
    lane_id: string;
    nonce: string;
    request_transaction: string;
    response_transaction?: Nullable<string>;
    sender: string;
    recipient: string;
    token: string;
    amount: string;
    start_timestamp: number;
    end_timestamp?: Nullable<number>;
    result?: Nullable<number>;
    fee?: Nullable<number>;
}

export class DVMLockRecord {
    id: string;
    laneId: string;
    nonce: BigInt;
    token: string;
    recipient: string;
    amount: BigInt;
    txHash: string;
}

export class UnlockRecord {
    id: string;
    laneId: string;
    nonce: number;
    txHash?: Nullable<string>;
    recipient: string;
    token: string;
    amount: string;
    timestamp?: Nullable<number>;
    block?: Nullable<JSON>;
}

export class S2sRecord {
    id: string;
    fromChain: string;
    fromChainMode: string;
    toChain: string;
    toChainMode: string;
    bridge: string;
    laneId: string;
    nonce: string;
    requestTxHash: string;
    responseTxHash?: Nullable<string>;
    sender: string;
    recipient: string;
    token: string;
    amount: string;
    startTime: number;
    endTime?: Nullable<number>;
    result: number;
    fee: string;
}

export class BurnRecordEntity_filter {
    start_timestamp_lt?: Nullable<number>;
}

export type BigInt = any;
export type JSON = any;
type Nullable<T> = T | null;
