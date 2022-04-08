import { Account, Transfer } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex, isHex } from '@polkadot/util';

export class TransferHandler {
  static async ensureTransfer(id: string) {
    const transfer = await Transfer.get(id);

    if (!transfer) {
      const transfer = new Transfer(id);

      transfer.save();

      return transfer;
    }
  }
}
