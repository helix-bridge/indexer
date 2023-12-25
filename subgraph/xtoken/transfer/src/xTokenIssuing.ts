import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  BurnAndRemoteUnlocked,
  RemoteUnlockForIssuingFailureRequested,
} from "../generated/xTokenIssuing/xTokenIssuing"
import { xTokenNonceOrder, TransferRecord, RefundTransferRecord } from "../generated/schema"

const transferNonceId = "0x01";

function isMsglineContract(event: ethereum.Log): boolean {
    return event.address.toHexString() == '0x00000000001523057a05d6293c1e5171ee33ee0a' ||
        event.address.toHexString() == '0x00000000046bc530804d66b6b64f7af69b4e4e81';
}

function isMsglineAcceptEvent(event: ethereum.Log): boolean {
    return event.topics[0].toHexString() == '0x327110434bca326d1f70236295f59c8b472ebc683a6549ca9254697564fec4a5' &&
        isMsglineContract(event);
}

function isMsglineDeliveryEvent(event: ethereum.Log): boolean {
    return event.topics[0].toHexString() == '0x62b1dc20fd6f1518626da5b6f9897e8cd4ebadbad071bb66dc96a37c970087a8' &&
        isMsglineContract(event);
}

export function handleBurnAndRemoteUnlocked(event: BurnAndRemoteUnlocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }

  let counter = xTokenNonceOrder.load(transferNonceId);
  if (counter == null) {
      counter = new xTokenNonceOrder(transferNonceId);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  entity.direction = 'burn';
  entity.remoteChainId = event.params.remoteChainId.toI32();
  entity.nonce = counter.count;
  entity.sender = event.params.sender;
  entity.receiver = event.params.recipient;
  entity.token = event.params.originalToken;
  entity.amount = event.params.amount;
  entity.transactionHash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.fee = event.params.fee;
  entity.userNonce = event.params.nonce.toHexString();

  var messageId: string;
  // find the messageId
  if (event.receipt == null) {
      return;
  } else {
      const logs = event.receipt!.logs;
      for (var idx = 0; idx < logs.length; idx++) {
          if (isMsglineAcceptEvent(logs[idx])) {
              messageId = logs[idx].topics[1].toHexString();
              break;
          }
      }
  }
  if (!messageId) {
      return;
  }
  entity.messageId = messageId;
  entity.save();
}

// refund txs
export function handleRemoteUnlockForIssuingFailureRequested(event: RemoteUnlockForIssuingFailureRequested): void {
  var messageId = '';
  if (event.receipt == null) {
      return;
  } else {
      const logs = event.receipt!.logs;
      for (var idx = 0; idx < logs.length; idx++) {
          if (isMsglineAcceptEvent(logs[idx])) {
              messageId = logs[idx].topics[1].toHexString();
              break;
          }
      }
  }
  if (!messageId) {
      return;
  }
  let entity = RefundTransferRecord.load(messageId);
  if (entity == null) {
      entity = new RefundTransferRecord(messageId);
  }
  entity.sourceId = event.params.transferId.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

