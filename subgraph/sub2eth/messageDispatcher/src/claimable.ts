import { BigInt } from "@graphprotocol/graph-ts"
import {
  MessageDispatched,
} from "../generated/InboundLane/InboundLane"
import {
  TokenDeposit,
  TokenClaimed,
} from "../generated/Guard/Guard"
import { MessageDispatchedResult } from "../generated/schema"

const STATUS_PENDING = 1;
const STATUS_SUCCESSED = 2;
const STATUS_FAILED = 3;

export function handleMessageDispatched(event: MessageDispatched): void {
  let message_id = event.params.nonce.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      entity = new MessageDispatchedResult(message_id);
  }
  entity.timestamp = event.block.timestamp;
  if (!event.params.result) {
      entity.transaction_hash = event.transaction.hash;
      entity.result = STATUS_FAILED;
  }
  entity.save();
}

export function handleTokenDeposit(event: TokenDeposit): void {
  let message_id = event.params.id.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      entity = new MessageDispatchedResult(message_id);
  }
  entity.timestamp = event.block.timestamp;
  entity.token = event.params.token;
  entity.result = STATUS_PENDING;
  entity.save();
}

export function handleTokenClaimed(event: TokenClaimed): void {
  let message_id = event.params.id.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      return;
  }
  entity.transaction_hash = event.transaction.hash;
  entity.result = STATUS_SUCCESSED;
  entity.save();
}

