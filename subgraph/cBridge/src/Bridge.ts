import { BigInt } from '@graphprotocol/graph-ts';
import { Relay, Send, WithdrawDone } from '../generated/Bridge/Bridge';
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
// crab smart chain <> others USDT/USDC 

const SupportedChains: number[] = [1, 44, 128, 137, 42161, 43114, 10, 56, 592];
const SupportedTokens: string[] = [
  // ring on heco
  "0x15e65456310ecb216b51efbd8a1dbf753353dcf9",
  // ring on ethereum
  "0x9469d013805bffb7d3debe5e7839237e535ec483",
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
  // usdc on Arbitrum
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
  // usdt on Arbitrum
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  // ring on polygon
  "0x9c1c23e60b72bc88a043bf64afdb16a02540ae8f",
  // usdc on Polygon
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  // usdt on Polygon
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  // usdc on Avalanche
  "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
  // usdt on Avalanche
  "0xc7198437980c041c805a1edcba50c1ce5db95118",
  // usdc on Optimism
  "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
  // usdt on Optimism
  "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
  // usdc on Astar
  "0x6a2d262d56735dba19dd70682b39f6be9a931d98",
  // usdt on Astar
  "0x3795c36e7d12a8c252a20c5a7b455f7c57b60283",
  // busd on Astar
  "0x4bf769b05e832fcdc9053fffbc78ca889acb5e1e",
  // ring on crab smart chain
  "0x7399ea6c9d35124d893b8d9808930e9d3f211501",
  // usdc on crab smart chain
  "0x81ecac0d6be0550a00ff064a4f9dd2400585fe9c",
  // usdt on crab smart chain
  "0x6a2d262d56735dba19dd70682b39f6be9a931d98",
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

