import { Account } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex, isHex } from '@polkadot/util';

export class AccountHandler {
  static convertToDVMAddress(address: string) {
    if (isHex(address)) {
      return address;
    }

    if (!address) {
      return '';
    }

    return u8aToHex(decodeAddress(address));
  }

  static convertToEthereumFormat(address: string): string | null {
    if (!address) {
      return '';
    }
  
    const startAt = 2;
    const result = u8aToHex(decodeAddress(address)).slice(startAt);
    const PREFIX = '64766d3a00000000000000';
  
    // eslint-disable-next-line no-magic-numbers
    return result.startsWith(PREFIX) ? '0x' + result.slice(-42, -2) : null;
  }

  static async ensureAccount(id: string) {
    const account = await Account.get(id);

    if (!account) {
      const acc = new Account(id);

      acc.transferTotalCount = 0;
      acc.save();

      return acc;
    }
  }

  static async getAccountById(id: string) {
    await this.ensureAccount(id);

    const account = await Account.get(id);

    return account;
  }

  static async updateAccount(id: string, data: Record<string, any>) {
    const account = await this.getAccountById(id);

    Object.entries(data).forEach(([key, value]) => {
      account[key] = value;
    });

    await account.save();
  }

  static async updateTransferStatistic(id: string) {
    const account = await this.getAccountById(id);

    await this.updateAccount(id, { transferTotalCount: account.transferTotalCount + 1 });
  }
}
