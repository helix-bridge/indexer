import { BigInt } from '@graphprotocol/graph-ts';
import { Relay, Send, WithdrawDone } from '../generated/Bridge/Bridge';
import { TransferRecord, RelayRecord } from '../generated/schema';

var HelixPrefix: BigInt = BigInt.fromI32(26744);

const SupportedChains: number[] = [1, 44, 128, 137];
const SupportedTokens: string[] = [
  // ring on crab
  "0x7399ea6c9d35124d893b8d9808930e9d3f211501",
  // ring on heco
  "0x15e65456310ecb216b51efbd8a1dbf753353dcf9",
  // ring on polygon
  "0x9c1c23e60b72bc88a043bf64afdb16a02540ae8f",
  // ring on ethereum
  "0x9469d013805bffb7d3debe5e7839237e535ec483",
];

function checkHelixEvent(srcid: number, token: string): boolean {
  return SupportedChains.includes(srcid) && SupportedTokens.includes(token);
}

// target chain
export function handleRelay(event: Relay): void {
  if (!checkHelixEvent(event.params.srcChainId.toI32(), event.params.token.toHexString())) {
    return;
  }
  let id = event.params.transferId.toHexString();
  let entity = RelayRecord.load(id);
  if (entity == null) {
    entity = new RelayRecord(id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.receiver;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.src_chainid = event.params.srcChainId;
  entity.src_transferid = event.params.srcTransferId;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

// source chain
export function handleSend(event: Send): void {
  if (event.params.nonce >> 48 != HelixPrefix) {
    return;
  }
  let message_id = event.params.transferId.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
    entity = new TransferRecord(message_id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.receiver;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.dst_chainid = event.params.dstChainId;
  entity.nonce = event.params.nonce;
  entity.max_slippage = event.params.maxSlippage;
  entity.request_transaction = event.transaction.hash;
  entity.start_timestamp = event.block.timestamp;
  entity.save();
}

// source chain
export function handleWithdrawDone(event: WithdrawDone): void {
  let message_id = event.params.refid.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
    return;
  }
  entity.withdraw_id = event.params.withdrawId;
  entity.withdraw_transaction = event.transaction.hash;
  entity.withdraw_timestamp = event.block.timestamp;
  entity.save();
}
