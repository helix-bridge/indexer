import { BigInt, ethereum } from "@graphprotocol/graph-ts"
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

function isMsglineContract(event: ethereum.Log): boolean {
    return event.address.toHexString() == '0x00000000001523057a05d6293c1e5171ee33ee0a' ||
        event.address.toHexString() == '0x00000000046bc530804d66b6b64f7af69b4e4e81';
}

function isMsglineDispatchEvent(event: ethereum.Log): boolean {
    return event.topics[0].toHexString() == '0x62b1dc20fd6f1518626da5b6f9897e8cd4ebadbad071bb66dc96a37c970087a8' &&
        isMsglineContract(event);
}

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
  var messageId = '';
  // find the messageId
  if (event.receipt == null) {
      return;
  } else {
      const logs = event.receipt!.logs;
      for (var idx = 0; idx < logs.length; idx++) {
          if (isMsglineDispatchEvent(logs[idx])) {
              messageId = logs[idx].topics[1].toHexString();
              break;
          }
      }
  }

  if (messageId === '') {
      return;
  }

  let entity = MessageDispatchedResult.load(messageId);
  if (entity == null) {
      entity = new MessageDispatchedResult(messageId);
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

