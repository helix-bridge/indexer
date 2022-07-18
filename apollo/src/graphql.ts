
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

    abstract historyRecords(sender?: Nullable<string>, recipient?: Nullable<string>, row?: Nullable<number>, page?: Nullable<number>, result?: Nullable<number>): Nullable<HistoryRecords> | Promise<Nullable<HistoryRecords>>;
}

export class HistoryRecord {
    id: string;
    fromChain: string;
    toChain: string;
    bridge: string;
    bridgeDispatchError?: Nullable<string>;
    laneId: string;
    nonce: BigInt;
    requestTxHash: string;
    targetTxHash?: Nullable<string>;
    responseTxHash?: Nullable<string>;
    sender: string;
    recipient: string;
    token: string;
    amount: string;
    startTime: number;
    endTime?: Nullable<number>;
    result: number;
    fee: string;
    feeToken: string;
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

export type BigInt = any;
export type JSON = any;
type Nullable<T> = T | null;
