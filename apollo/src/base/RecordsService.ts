import { getUnixTime } from 'date-fns';
import { upperFirst } from 'lodash';
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
  abstract checkDispatched(
    transfer: Transfer,
    action: TransferAction,
    index: number
  ): Promise<void>;
  abstract checkConfirmed(transfer: Transfer, action: TransferAction, index: number): Promise<void>;

  protected abstract genID(transfer: Transfer, action: TransferAction, identifier: string): string;

  protected toUnixTime(time: string) {
    const timezone = new Date().getTimezoneOffset() * 60;
    return getUnixTime(new Date(time)) - timezone;
  }

  private parseInfo(obj: { [key: string]: number | string | bigint }) {
    return Object.entries(obj)
      .map(([key, value]) => `${upperFirst(key)}: ${value}`)
      .join('; ');
  }

  fetchRecordsLog(
    action: TransferAction | 'Smart',
    fromChain: string,
    toChain: string,
    info: { error?: any; [key: string]: any }
  ) {
    const { error, ...rest } = info;
    const flag = `[${upperFirst(action)}]`;

    return !!error
      ? `${flag} Save new ${fromChain} to ${toChain} ${action} records failed ${error}`
      : `${flag} Save new ${fromChain} to ${toChain} ${action} records success. ${this.parseInfo(
          rest
        )}`;
  }

  checkRecordsLog(
    action: TransferAction,
    fromChain: string,
    toChain: string,
    info: { error?: any; [key: string]: any }
  ) {
    const { error, ...rest } = info;
    const flag = `[${upperFirst(action)} Dispatch]`;

    return error
      ? `${flag} Update ${fromChain} to ${toChain} dispatch records failed ${error}`
      : `${flag} Update ${fromChain} to ${toChain} dispatch records success. ${this.parseInfo(
          rest
        )}`;
  }

  checkConfirmRecordsLog(
    action: TransferAction,
    fromChain: string,
    toChain: string,
    info: { error?: any; [key: string]: any }
  ) {
    const { error, ...rest } = info;
    const flag = `[${upperFirst(action)} Confirm]`;

    return error
      ? `${flag} Update ${fromChain} to ${toChain} ${action} records failed. ${error}`
      : `${flag} Update ${fromChain} to ${toChain} ${action} records success. ${this.parseInfo(
          rest
        )}`;
  }
}
