import { BigInt } from "@graphprotocol/graph-ts"
import {
  MessageDispatched,
} from "../generated/InboundLane/InboundLane"
import { MessageDispatchedResult } from "../generated/schema"

export function handleMessageDispatched(event: MessageDispatched): void {
  let message_id = event.params.nonce.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      entity = new MessageDispatchedResult(message_id);
  }
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.result = event.params.result;
  entity.save();
}

