import { BigInt } from "@graphprotocol/graph-ts"
import {
  TokenLocked,
  TokenUnlockedForFailed,
  RemoteIssuingFailure,
} from "../generated/NativeParachainBacking/NativeParachainBacking"
import { TransferRecord, RefundTransferRecord } from "../generated/schema"

export function handleTokenLocked(event: TokenLocked): void {
  let message_id = event.params.nonce.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.recipient;
  entity.amount = event.params.amount;
  entity.transaction = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.fee = event.params.fee;
  entity.save();
}

export function handleTokenUnlockedForFailed(event: TokenUnlockedForFailed): void {
  let id = event.params.nonce.toHexString();
  let entity = TransferRecord.load(id);
  if (entity == null) {
      return;
  }
  entity.withdrawamount = event.params.amount;
  entity.withdrawtransaction = event.transaction.hash;
  entity.withdrawtimestamp = event.block.timestamp;
  entity.save();
}

// refund txs
export function handleRemoteIssuingFailure(event: RemoteIssuingFailure): void {
  let id = event.params.refundNonce.toHexString();
  let entity = RefundTransferRecord.load(id);
  if (entity == null) {
      entity = new RefundTransferRecord(id);
  }
  entity.sourceid = event.params.failureNonce.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.transaction = event.transaction.hash;
  entity.save();
}

