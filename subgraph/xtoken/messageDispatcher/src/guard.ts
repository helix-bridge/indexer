import { BigInt } from "@graphprotocol/graph-ts"
import {
  TokenDeposit,
  TokenClaimed,
} from "../generated/Guard/Guard"
import { MessageDispatchedResult } from "../generated/schema"

const STATUS_PENDING_TOCLAIM = 3;
// claimed
const STATUS_CLAIMED = 4;

export function handleTokenDeposit(event: TokenDeposit): void {
  let message_id = event.params.id.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      entity = new MessageDispatchedResult(message_id);
  }
  entity.transactionHash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.token = event.params.token;
  entity.result = STATUS_PENDING_TOCLAIM;
  entity.save();
}

export function handleTokenClaimed(event: TokenClaimed): void {
  let message_id = event.params.id.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      return;
  }
  entity.transactionHash = event.transaction.hash;
  entity.result = STATUS_CLAIMED;
  entity.save();
}

