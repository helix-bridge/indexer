import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  TokenDeposit,
  TokenClaimed,
} from "../generated/Guard/Guard"
import { MessageDispatchedResult, TransferId2MessageId } from "../generated/schema"

const STATUS_PENDING_TOCLAIM = 3;
// claimed
const STATUS_CLAIMED = 4;

function isMsglineContract(event: ethereum.Log): boolean {
    return event.address.toHexString() == '0x00000000001523057a05d6293c1e5171ee33ee0a' ||
        event.address.toHexString() == '0x00000000046bc530804d66b6b64f7af69b4e4e81';
}

function isMsglineDispatchEvent(event: ethereum.Log): boolean {
    return event.topics[0].toHexString() == '0x62b1dc20fd6f1518626da5b6f9897e8cd4ebadbad071bb66dc96a37c970087a8' &&
        isMsglineContract(event);
}

export function handleTokenDeposit(event: TokenDeposit): void {
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
  entity.transactionHash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.token = event.params.token;
  entity.result = STATUS_PENDING_TOCLAIM;
  entity.save();

  const transferId = event.params.id.toHexString();
  let idEntity = TransferId2MessageId.load(transferId);
  if (idEntity == null) {
      idEntity = new TransferId2MessageId(transferId);
  }
  idEntity.messageId = messageId;
  idEntity.save();
}

export function handleTokenClaimed(event: TokenClaimed): void {
  let transferId = event.params.id.toHexString();
  let idEntity = TransferId2MessageId.load(transferId);
  if (idEntity == null) {
      return;
  }
  let entity = MessageDispatchedResult.load(idEntity.messageId);
  if (entity == null) {
      return;
  }
  entity.transactionHash = event.transaction.hash;
  entity.result = STATUS_CLAIMED;
  entity.save();
}

