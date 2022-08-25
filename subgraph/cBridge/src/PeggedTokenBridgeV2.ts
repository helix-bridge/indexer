import { BigInt } from '@graphprotocol/graph-ts';
import { Mint, Burn } from '../generated/PeggedTokenBridgeV2/PeggedTokenBridgeV2';
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

// is_pegged
// 44  crab smart chain usdt/usdc 
// 592 astar usdt/usdc

const SupportedChains: number[] = [1, 44, 128, 137, 42161, 43114, 10, 56, 592];
const SupportedTokens: string[] = [
  // usdc on ethereum
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  // usdt on ethereum
  "0xdac17f958d2ee523a2206206994597c13d831ec7",
  // busd on ethereum
  "0x4fabb145d64652a948d72533023f6e7a623c7c53",
  // usdc on bsc
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  // usdt on bsc
  "0x55d398326f99059ff775485246999027b3197955",
  // busd on bsc
  "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  // usdc on Astar
  "0x6a2d262d56735dba19dd70682b39f6be9a931d98",
  // usdt on Astar
  "0x3795c36e7d12a8c252a20c5a7b455f7c57b60283",
  // busd on Astar
  "0x4bf769b05e832fcdc9053fffbc78ca889acb5e1e",
  // usdc on crab smart chain
  "0x81ecac0d6be0550a00ff064a4f9dd2400585fe9c",
  // usdt on crab smart chain
  "0x6a2d262d56735dba19dd70682b39f6be9a931d98",
];

function checkHelixEvent(srcid: number, token: string): boolean {
  return SupportedChains.includes(srcid) && SupportedTokens.includes(token);
}

// is pegged
export function handleBurn(event: Burn): void {
  if (event.params.nonce >> 48 != HelixPrefix) {
    return;
  }
  let message_id = event.params.burnId.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
    entity = new TransferRecord(message_id);
  }
  entity.sender = event.params.account;
  entity.receiver = event.params.toAccount;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.dst_chainid = event.params.toChainId;
  entity.nonce = event.params.nonce;
  entity.max_slippage = null;
  entity.request_transaction = event.transaction.hash;
  entity.start_timestamp = event.block.timestamp;
  entity.save();
}

export function handleMint(event: Mint): void {
  if (!checkHelixEvent(event.params.refChainId.toI32(), event.params.token.toHexString())) {
    return;
  }
  let id = event.params.mintId.toHexString();
  let entity = RelayRecord.load(id);
  if (entity == null) {
    entity = new RelayRecord(id);
  }
  entity.sender = event.params.account;
  entity.receiver = event.params.depositor;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.src_chainid = event.params.refChainId;
  entity.src_transferid = event.params.refId;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

