import { BigInt, ByteArray, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  BurnAndXUnlocked,
  RollbackLockAndXIssueRequested,
} from "../generated/xTokenIssuing/xTokenIssuing"
import { xTokenNonceOrder, TransferRecord, RefundTransferRecord } from "../generated/schema"

const transferNonceId = "0x01";

function isMsglineContract(event: ethereum.Log): boolean {
    return event.address.toHexString() == '0x0000000005d961f950ada391c1511c92bbc64d9f' ||
        event.address.toHexString() == '0x00000000001523057a05d6293c1e5171ee33ee0a';
}

function isMsglineAcceptEvent(event: ethereum.Log): boolean {
    return event.topics[0].toHexString() == '0x327110434bca326d1f70236295f59c8b472ebc683a6549ca9254697564fec4a5' &&
        isMsglineContract(event);
}

function isGuardAddress(address: string): boolean {
    return address == "0x4ca75992d2750bec270731a72dfdede6b9e71cc7"; // testnet
}

function isWTokenConvertor(address: string): boolean {
    return address == "0xb3a8db63d6fbe0f50a3d4977c3e892543d772c4a" ||  // testnet
        address == "0xa8d0e9a45249ec839c397fa0f371f5f64ecab7f7" ||
        address == "0x004d0de211bc148c3ce696c51cbc85bd421727e9" ||
        address == "0x092e19c46c9daab7824393f1cd9c22f5bea13560";
}

// abi.encode(address, bytes)
function parseExtData(extData: string): string {
    const address = '0x' + extData.substring(26, 66);
    if (isWTokenConvertor(address)) {
        return '0x' + extData.substring(194, 234);
    } else {
        return address;
    }
}

export function handleBurnAndXUnlocked(event: BurnAndXUnlocked): void {
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
  entity.sender = event.transaction.from;
  const recipient = event.params.recipient.toHexString();
  entity.receiver = recipient;
  entity.token = event.params.originalToken;
  entity.amount = event.params.amount;
  entity.transactionHash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.fee = event.params.fee;
  entity.userNonce = event.params.nonce.toHexString();
  const extData = event.params.extData.toHexString();
  entity.extData = extData;

  if (isGuardAddress(recipient)) {
      entity.receiver = parseExtData(extData);
  } else if (isWTokenConvertor(recipient)) {
      entity.receiver = extData;
  }

  var messageId: string;
  // find the messageId
  if (event.receipt == null) {
      return;
  } else {
      const logs = event.receipt!.logs;
      for (var idx = 0; idx < logs.length; idx++) {
          if (isMsglineAcceptEvent(logs[idx])) {
              messageId = logs[idx].topics[1].toHexString();
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
export function handleRollbackLockAndXIssueRequested(event: RollbackLockAndXIssueRequested): void {
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

