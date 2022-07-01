export abstract class RecordsService {
  abstract fetchLockRecords(): Promise<void>;

  abstract fetchBurnRecords(): Promise<void>;

  abstract checkLockRecords(): Promise<void>;

  abstract checkBurnRecords(): Promise<void>;

  abstract checkConfirmedLockRecords(): Promise<void>;

  abstract checkConfirmedBurnRecords(): Promise<void>;
}
