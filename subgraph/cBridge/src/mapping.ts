import { BigInt } from "@graphprotocol/graph-ts"
import {
  Relay,
  Send,
  WithdrawDone
} from "../generated/Bridge/Bridge"
import { TransferRecord, RelayRecord } from "../generated/schema"

let HelixPrefix: BigInt = BigInt.fromI32(26744);

// target chain
export function handleRelay(event: Relay): void {
  let id = event.params.transferId.toHexString();
  let entity = RelayRecord.load(id);
  if (entity == null) {
      entity = new RelayRecord(id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.receiver;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.src_chainid = event.params.srcChainId;
  entity.src_transferid = event.params.srcTransferId;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

// source chain
export function handleSend(event: Send): void {
  if (event.params.nonce >> 48 != HelixPrefix) {
      return;
  }
  let message_id = event.params.transferId.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.receiver;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.dst_chainid = event.params.dstChainId;
  entity.nonce = event.params.nonce;
  entity.max_slippage = event.params.maxSlippage;
  entity.request_transaction = event.transaction.hash;
  entity.start_timestamp = event.block.timestamp;
  entity.save();
}

// source chain
export function handleWithdrawDone(event: WithdrawDone): void {
  let message_id = event.params.refid.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      return;
  }
  entity.withdraw_id = event.params.withdrawId;
  entity.withdraw_transaction = event.transaction.hash;
  entity.withdraw_timestamp = event.block.timestamp;
  entity.save();
}

