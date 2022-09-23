import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  TokenLocked,
  TokenUnlockedForFailed,
  RemoteIssuingFailure,
} from "../generated/Erc20Sub2EthBacking/Erc20Sub2EthBacking"
import { TransferRecord, RefundTransferRecord } from "../generated/schema"

export function handleTokenLocked(event: TokenLocked): void {
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
  entity.fee = event.params.fee;
  entity.is_native = event.params.isNative;
  entity.save();
}

export function handleTokenUnlockedForFailed(event: TokenUnlockedForFailed): void {
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
export function handleRemoteIssuingFailure(event: RemoteIssuingFailure): void {
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

