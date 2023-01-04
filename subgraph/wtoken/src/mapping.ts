import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Deposit,
  Withdrawal,
} from "../generated/wtoken/wtoken"
import { TransferRecord } from "../generated/schema"

const FilterAddress: string[] = [
    // s2s backing on crab
    "0xcf8923ebf4244cedc647936a0281dd10bdfcbf18",
    // snow router on crab
    "0xaf5caa87a7d3718622604268c43ff6ce9d2cec3c",
    // s2s backing on darwinia
    "0xf3c1444cd449bd66ef6da7ca6c3e7884840a3995",
    // s2e backing
    "0xd1b10b114f1975d8bcc6cb6fc43519160e2aa978",
    // snow router on darwinia
    "0xb899409cda0ffa2bf87f9c7b31f3c77d6a3a0bb0",
];

export function handleDeposit(event: Deposit): void {
  let message_id = event.transaction.hash.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.account = event.params.dst;
  entity.amount = event.params.wad;
  entity.timestamp = event.block.timestamp;
  entity.direction = 0;
  entity.save();
}

export function handleWithdrawal(event: Withdrawal): void {
  let message_id = event.transaction.hash.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.account = event.params.src;
  entity.amount = event.params.wad;
  entity.timestamp = event.block.timestamp;
  entity.direction = 1;
  entity.save();
}

