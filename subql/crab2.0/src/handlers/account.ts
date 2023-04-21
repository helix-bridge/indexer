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
}
