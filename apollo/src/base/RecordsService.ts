import { getUnixTime } from 'date-fns';
import { Transfer, TransferAction } from './TransferService';

export abstract class RecordsService {
  protected abstract needSyncLock: boolean[];
  protected abstract needSyncLockConfirmed: boolean[];
  protected abstract needSyncBurn: boolean[];
  protected abstract needSyncBurnConfirmed: boolean[];
  protected abstract isSyncingHistory: boolean[];

  protected fetchHistoryDataInterval = 10000;
  protected fetchHistoryDataFirst = 10;

  abstract fetchRecords(transfer: Transfer, action: TransferAction, index: number): Promise<void>;
  abstract checkRecords(transfer: Transfer, action: TransferAction, index: number): Promise<void>;
  abstract checkConfirmedRecords(
    transfer: Transfer,
    action: TransferAction,
    index: number
  ): Promise<void>;

  protected abstract genID(transfer: Transfer, action: TransferAction, identifier: string): string;

  protected toUnixTime(time: string) {
    const timezone = new Date().getTimezoneOffset() * 60;
    return getUnixTime(new Date(time)) - timezone;
  }
}

/**
 * 1. backingUrl, issuingUrl, fetchDataInterval, fetchDataFirst, needSyncLock, needSyncLockConfirmed, needSyncBurn, needSyncBurnConfirmed, isSyncingHistory, subql
 * 2. log, warn methods
 */
