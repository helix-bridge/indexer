/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */
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

export class S2sEvent {
    id: string;
    laneId: string;
    nonce: string;
    requestTxHash: string;
    responseTxHash?: Nullable<string>;
    sender: string;
    result: number;
    recipient: string;
    token: string;
    amount: string;
    startTimestamp: string;
    endTimestamp?: Nullable<string>;
    fee: string;
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
    startTime: string;
    endTime?: Nullable<string>;
    result: number;
    fee: string;
}

export class DailyStatistic {
    id: string;
    dailyVolume?: Nullable<BigInt>;
    dailyCount?: Nullable<number>;
}

export class BurnRecordEntity_filter {
    start_timestamp_lt?: Nullable<number>;
}

export abstract class IQuery {
    abstract burnRecordEntities(first?: Nullable<number>, start_timestamp?: Nullable<number>, sender?: Nullable<string>, recipient?: Nullable<string>): Nullable<Nullable<BurnRecordEntity>[]> | Promise<Nullable<Nullable<BurnRecordEntity>[]>>;

    abstract lockRecordEntities(first?: Nullable<number>, start_timestamp?: Nullable<number>, sender?: Nullable<string>, recipient?: Nullable<string>): Nullable<Nullable<S2sEvent>[]> | Promise<Nullable<Nullable<S2sEvent>[]>>;

    abstract s2sRecords(first?: Nullable<number>, start_timestamp?: Nullable<number>, sender?: Nullable<string>): Nullable<Nullable<S2sRecord>[]> | Promise<Nullable<Nullable<S2sRecord>[]>>;

    abstract dailyStatistics(first?: Nullable<number>, timepast?: Nullable<number>, chain?: Nullable<string>): Nullable<Nullable<DailyStatistic>[]> | Promise<Nullable<Nullable<DailyStatistic>[]>>;
}

export type BigInt = any;
type Nullable<T> = T | null;
