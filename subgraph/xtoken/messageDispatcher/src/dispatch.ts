import { BigInt } from "@graphprotocol/graph-ts"
import {
  MessageDispatched,
} from "../generated/ormp/ormp"
import {
  CallResult,
} from "../generated/MsglineMessager/MsglineMessager"
import { MessageDispatchedResult } from "../generated/schema"

// default status
const STATUS_DELIVERED = 0;
// app call failed
const STATUS_FAILED = 1;
// app call successed, maybe pending to claim
// 1. no need to claim: finished
// 2. need to claim: pending to claim
const STATUS_DELIVERED_SUCCESSED = 2;

export function handleMessageDispatched(event: MessageDispatched): void {
  let message_id = event.params.msgHash.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      entity = new MessageDispatchedResult(message_id);
  }
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  if (!event.params.dispatchResult) {
      entity.result = STATUS_FAILED;
  }
  entity.save();
}

export function handleCallResult(event: CallResult): void {
  let message_id = event.params.transferId.toHexString();
  let entity = MessageDispatchedResult.load(message_id);
  if (entity == null) {
      entity = new MessageDispatchedResult(message_id);
  }
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  if (!event.params.result) {
      entity.result = STATUS_FAILED;
  } else if(entity.result < STATUS_DELIVERED_SUCCESSED) {
      entity.result = STATUS_DELIVERED_SUCCESSED;
  }
  entity.save();
}

