import { BigInt } from "@graphprotocol/graph-ts"
import {
    TransferFilled,
    Slash,
    MarginUpdated,
} from "../generated/LnDefaultBridgeTarget/LnDefaultBridgeTarget"
import { Lnv2RelayRecord, Lnv2RelayUpdateRecord } from "../generated/schema"

const SLASH = 1;
const MARGIN_UPDATE = 2;

export function handleTransferFilled(event: TransferFilled): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2RelayRecord(message_id);
  }
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.save();
}

export function handleSlash(event: Slash): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2RelayRecord(message_id);
  }
  entity.slasher = event.params.slasher;
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.save();
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.updateType = SLASH;
  relayEntity.provider = event.params.provider;
  relayEntity.token = event.params.token;
  relayEntity.transaction_hash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.margin;
  relayEntity.save();
}

export function handleMarginUpdated(event: MarginUpdated): void {
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.updateType = MARGIN_UPDATE;
  relayEntity.provider = event.params.provider;
  relayEntity.token = event.params.token;
  relayEntity.transaction_hash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.amount;
  relayEntity.withdrawNonce = event.params.withdrawNonce;
  relayEntity.save();
}
