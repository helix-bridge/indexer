import { Account } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex, isHex } from '@polkadot/util';

export class AccountHandler {
  static formatAddress(address: string) {
    if (isHex(address)) {
      return address;
    }

    if (!address) {
      return '';
    }

    return u8aToHex(decodeAddress(address));
  }

  static async ensureAccount(id: string) {
    const account = await Account.get(id);

    if (!account) {
      const acc = new Account(id);

      acc.s2sLockedTotalCount = 0;
      acc.s2sLockedTotalAmount = BigInt(0);
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

  static async updateS2SLockedStatistic(id: string, amount: bigint) {
    const account = await this.getAccountById(id);

    await this.updateAccount(id, {
      s2sLockedTotalCount: account.s2sLockedTotalCount + 1,
      s2sLockedTotalAmount: account.s2sLockedTotalAmount + BigInt(amount),
    });
  }
}
