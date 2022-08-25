import { BigInt } from '@graphprotocol/graph-ts';
import { Withdrawn, Deposited } from '../generated/OriginalTokenVaultV2/OriginalTokenVaultV2';
import { TransferRecord, RelayRecord } from '../generated/schema';

var HelixPrefix: BigInt = BigInt.fromI32(26744);

// ethereum: 1
// crab smart chain: 44
// heco: 128
// polygon: 137
// arbitrum: 42161
// Avalanche: 43114
// Optimism: 10
// bsc: 56
// Astar: 592

const SupportedChains: number[] = [44, 592, 1, 128, 137, 42161, 43114, 10];
const SupportedTokens: string[] = [
  // usdc on ethereum
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  // usdt on ethereum
  "0xdac17f958d2ee523a2206206994597c13d831ec7",
  // busd on bsc
  "0xe9e7cea3dedca5984780bafc599bd69add087d56",
];

function checkHelixEvent(srcid: number, token: string): boolean {
  return SupportedChains.includes(srcid) && SupportedTokens.includes(token);
}

export function handleDeposited(event: Deposited): void {
  if (event.params.nonce >> 48 != HelixPrefix) {
    return;
  }
  let message_id = event.params.depositId.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
    entity = new TransferRecord(message_id);
  }
  entity.sender = event.params.depositor;
  entity.receiver = event.params.mintAccount;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.dst_chainid = event.params.mintChainId;
  entity.nonce = event.params.nonce;
  entity.max_slippage = null;
  entity.request_transaction = event.transaction.hash;
  entity.start_timestamp = event.block.timestamp;
  entity.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  if (!checkHelixEvent(event.params.refChainId.toI32(), event.params.token.toHexString())) {
    return;
  }
  let id = event.params.withdrawId.toHexString();
  let entity = RelayRecord.load(id);
  if (entity == null) {
    entity = new RelayRecord(id);
  }
  entity.sender = event.params.burnAccount;
  entity.receiver = event.params.receiver;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.src_chainid = event.params.refChainId;
  entity.src_transferid = event.params.refId;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

