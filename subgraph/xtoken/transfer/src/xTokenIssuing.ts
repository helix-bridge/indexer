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

function isMsglineDeliveryEvent(event: ethereum.Log): boolean {
    return event.topics[0].toHexString() == '0x62b1dc20fd6f1518626da5b6f9897e8cd4ebadbad071bb66dc96a37c970087a8' &&
        isMsglineContract(event);
}

function isGuardAddress(address: string): boolean {
    return address == "0x4ca75992d2750bec270731a72dfdede6b9e71cc7"; // testnet
}

function isWTokenConvertor(address: string): boolean {
    return address == "0x3aceb55aad4cdfe1531a9c6f6416753e6a7bdd49"; // testnet
}

function isXRingConvertor(address: string): boolean {
    return address == "0x917cb26bfcf9f6be65f387903aa9180613a40f41";
}

function isXRingConvertorEvent(event: ethereum.Log): boolean {
    return isXRingConvertor(event.address.toHexString()) &&
        event.topics[0].toHexString() == '0xe23676e6691ce6138d353b843afbe1e188c54bf9d04e99942c0a810b433da0ba';
}

function parseEventParams(types: string, input: Bytes): ethereum.Value | null {
  const tuplePrefix = ByteArray.fromHexString(
      '0x0000000000000000000000000000000000000000000000000000000000000020'
  );
  const functionInputAsTuple = new Uint8Array(
      tuplePrefix.length + input.length
  );
  functionInputAsTuple.set(tuplePrefix, 0);
  functionInputAsTuple.set(input, tuplePrefix.length);
  const tupleInputBytes = Bytes.fromUint8Array(functionInputAsTuple);
  return ethereum.decode(
      types,
      tupleInputBytes
  );
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
  const recipient = event.params.recipient;
  entity.receiver = recipient;
  entity.token = event.params.originalToken;
  entity.amount = event.params.amount;
  entity.transactionHash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.fee = event.params.fee;
  entity.userNonce = event.params.nonce.toHexString();
  entity.extData = event.params.extData.toHexString();

  if (isGuardAddress(recipient.toHexString())) {
      const decodedExtdata = parseEventParams(
          '(address,bytes)',
          event.params.extData
      )
      if (decodedExtdata !== null) {
          const extData = decodedExtdata.toTuple();
          const nextRecipient = extData[0].toAddress();
          if (isWTokenConvertor(nextRecipient.toHexString())) {
              entity.receiver = extData[1].toBytes();
          } else {
              entity.receiver = nextRecipient;
          }
      }
  } else if (isWTokenConvertor(recipient.toHexString())) {
      entity.receiver = event.params.extData;
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

