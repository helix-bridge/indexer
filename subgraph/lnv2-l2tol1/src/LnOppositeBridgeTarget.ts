import { BigInt } from "@graphprotocol/graph-ts"
import {
    TransferFilled,
} from "../generated/LnOppositeBridgeTarget/LnOppositeBridgeTarget"
import { Lnv2RelayRecord } from "../generated/schema"

export function handleTransferFilled(event: TransferFilled): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2RelayRecord(message_id);
  }
  entity.slasher = event.params.slasher;
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.save();
}
