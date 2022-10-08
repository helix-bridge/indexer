import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Deposit,
  Withdrawal,
} from "../generated/wtoken/wtoken"
import { TransferRecord } from "../generated/schema"

export function handleDeposit(event: Deposit): void {
  let message_id = event.transaction.hash.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.account = event.params.dst;
  entity.amount = event.params.wad;
  entity.timestamp = event.block.timestamp;
  entity.direction = 0;
  entity.save();
}

export function handleWithdrawal(event: Withdrawal): void {
  let message_id = event.transaction.hash.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.account = event.params.src;
  entity.amount = event.params.wad;
  entity.timestamp = event.block.timestamp;
  entity.direction = 1;
  entity.save();
}

