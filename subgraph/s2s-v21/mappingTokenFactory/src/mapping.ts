import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  BurnAndRemoteUnlocked,
  TokenRemintForFailed,
  RemoteUnlockFailure,
} from "../generated/Erc20Sub2SubMappingTokenFactory/Erc20Sub2SubMappingTokenFactory"
import { TransferRecord, RefundTransferRecord } from "../generated/schema"

export function handleBurnAndRemoteUnlocked(event: BurnAndRemoteUnlocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.recipient;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.transaction_hash = event.transaction.hash;
  entity.start_timestamp = event.block.timestamp;
  entity.messageHash = event.params.messageHash;
  entity.is_native = event.params.isNative;
  entity.fee = event.params.fee;
  entity.save();
}

export function handleTokenRemintForFailed(event: TokenRemintForFailed): void {
  let id = event.params.transferId.toHexString();
  let entity = TransferRecord.load(id);
  if (entity == null) {
      return;
  }
  entity.withdraw_amount = event.params.amount;
  entity.withdraw_transaction = event.transaction.hash;
  entity.withdraw_timestamp = event.block.timestamp;
  entity.save();
}

// refund txs
export function handleRemoteUnlockFailure(event: RemoteUnlockFailure): void {
  let id = event.params.refundId.toHexString();
  let entity = RefundTransferRecord.load(id);
  if (entity == null) {
      entity = new RefundTransferRecord(id);
  }
  entity.source_id = event.params.transferId as Bytes;
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.save();
}

