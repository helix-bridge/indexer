import { BigInt } from "@graphprotocol/graph-ts"
import {
    TransferRelayed,
    TransferCanceled,
    CancelIssuingInited
} from "../generated/Lnv2Issuing/Lnv2Issuing"
import { Lnv2RelayRecord } from "../generated/schema"

const STATUS_RELAYED = 1;
const STATUS_CANCEL_INIT = 2;
const STATUS_CANCELED = 3;

export function handleTransferRelayed(event: TransferRelayed): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2RelayRecord(message_id);
  }
  entity.relayer = event.params.relayer;
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.status = STATUS_RELAYED;
  entity.save();
}

export function handleCancelIssuingInited(event: CancelIssuingInited): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2RelayRecord(message_id);
  }
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.status = STATUS_CANCEL_INIT;
  entity.save();
}

export function handleTransferCanceled(event: TransferCanceled): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2RelayRecord(message_id);
  }
  entity.relayer = event.params.sender;
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.status = STATUS_CANCELED;
  entity.save();
}

