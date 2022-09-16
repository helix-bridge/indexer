import { BigInt } from "@graphprotocol/graph-ts"
import {
  BurnAndRemoteUnlocked,
  TokenRemintForFailed,
} from "../generated/Erc20Sub2EthMappingTokenFactory/Erc20Sub2EthMappingTokenFactory"
import { TransferRecord } from "../generated/schema"

export function handleBurnAndRemoteUnlocked(event: BurnAndRemoteUnlocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = TransferRecord.load(message_id);
  if (entity == null) {
      entity = new TransferRecord(message_id);
  }
  entity.sender = event.params.sender;
  entity.receiver = event.params.recipient;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.transaction_hash = event.transaction.hash;
  entity.start_timestamp = event.block.timestamp;
  entity.fee = event.params.fee;
  entity.save();
}

export function handleTokenRemintForFailed(event: TokenRemintForFailed): void {
  let id = event.params.transferId.toHexString();
  let entity = TransferRecord.load(id);
  if (entity == null) {
      return;
  }
  entity.withdraw_amount = event.params.amount;
  entity.withdraw_transaction = event.transaction.hash;
  entity.withdraw_timestamp = event.block.timestamp;
  entity.save();
}

