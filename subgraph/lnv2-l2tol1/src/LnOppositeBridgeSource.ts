import { BigInt } from "@graphprotocol/graph-ts"
import {
    TokenLocked,
    Slash,
    LnProviderUpdated,
    LiquidityWithdrawn,
} from "../generated/LnOppositeBridgeSource/LnOppositeBridgeSource"
import { Lnv2TransferRecord, Lnv2RelayUpdateRecord } from "../generated/schema"

const PROVIDER_UPDATE = 0;
const SLASH = 1;
const WITHDRAW = 2;

export function handleTokenLocked(event: TokenLocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2TransferRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2TransferRecord(message_id);
  }

  entity.sender = event.transaction.from;
  entity.receiver = event.params.receiver;
  entity.provider = event.params.provider;
  entity.token = event.params.sourceToken;
  entity.amount = event.params.amount;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.fee = event.params.fee;
  entity.save();
}

export function handleSlash(event: Slash): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2TransferRecord.load(message_id);
  if (entity == null) {
      return;
  }
  entity.liquidate_withdrawn_sender = event.params.slasher;
  entity.liquidate_transaction_hash = event.transaction.hash;
  entity.liquidate_withdrawn_timestamp = event.block.timestamp;
  entity.save();
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.updateType = SLASH;
  relayEntity.provider = event.params.provider;
  relayEntity.token = event.params.token;
  relayEntity.transaction_hash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.margin;
  relayEntity.save();
}

export function handleLnProviderUpdated(event: LnProviderUpdated): void {
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.updateType = PROVIDER_UPDATE;
  relayEntity.provider = event.transaction.from;
  relayEntity.token = event.params.token;
  relayEntity.transaction_hash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.margin;
  relayEntity.baseFee = event.params.baseFee;
  relayEntity.liquidityFeeRate = event.params.liquidityfeeRate;
  relayEntity.save();
}

export function handleLiquidityWithdrawn(event: LiquidityWithdrawn): void {
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.updateType = WITHDRAW;
  relayEntity.provider = event.params.provider;
  relayEntity.token = event.params.token;
  relayEntity.transaction_hash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.amount;
  relayEntity.save();
}
