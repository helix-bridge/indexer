import { BigInt } from "@graphprotocol/graph-ts"
import {
  MessageDispatched,
} from "../generated/InboundLane/InboundLane"
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
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  if (!event.params.result) {
      entity.result = STATUS_FAILED;
  } else {
      entity.result = STATUS_SUCCESSED;
  }
  entity.save();
}

