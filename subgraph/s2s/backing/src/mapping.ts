import { BigInt } from "@graphprotocol/graph-ts"
import {
  TokenLocked,
  TokenUnlockedForFailed,
} from "../generated/Erc20Sub2SubBacking/Erc20Sub2SubBacking"
import { TokenLockedRecord } from "../generated/schema"

export function handleTokenLocked(event: TokenLocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = TokenLockedRecord.load(message_id);
  if (entity == null) {
      entity = new TokenLockedRecord(message_id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.recipient;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.transaction_hash = event.transaction.hash;
  entity.start_timestamp = event.block.timestamp;
  entity.messageHash = event.params.hash;
  entity.save();
}


export function handleTokenUnlockedForFailed(event: TokenUnlockedForFailed): void {
  let id = event.params.transferId.toHexString();
  let entity = TokenLockedRecord.load(id);
  if (entity == null) {
      return;
  }
  entity.withdraw_amount = event.params.amount;
  entity.withdraw_transaction = event.transaction.hash;
  entity.withdraw_timestamp = event.block.timestamp;
  entity.save();
}

