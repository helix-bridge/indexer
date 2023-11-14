import { BigInt } from "@graphprotocol/graph-ts"
import {
    TokenLocked,
    TransferFilled,
    Slash,
    LnProviderUpdated,
    LiquidityWithdrawn,
} from "../generated/LnOppositeBridge/LnOppositeBridge"
import { Lnv2TransferRecord, Lnv2RelayRecord, LnNonceOrder, Lnv2RelayUpdateRecord } from "../generated/schema"

const PROVIDER_UPDATE = 0;
const SLASH = 1;
const WITHDRAW = 2;

const lockRecordNonceId = "0x01";
const marginUpdateNonce = "0x02";
const feeUpdated = "0x03";

// source chain start
export function handleTokenLocked(event: TokenLocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2TransferRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2TransferRecord(message_id);
  }

  let counter = LnNonceOrder.load(lockRecordNonceId);
  if (counter == null) {
      counter = new LnNonceOrder(lockRecordNonceId);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  entity.remoteChainId = event.params.remoteChainId.toI32();
  entity.nonce = counter.count;
  entity.sender = event.transaction.from;
  entity.receiver = event.params.receiver;
  entity.provider = event.params.provider;
  entity.sourceToken = event.params.sourceToken;
  entity.targetToken = event.params.targetToken;
  entity.amount = event.params.amount;
  entity.transactionHash = event.transaction.hash;
  entity.timestamp = event.params.timestamp;
  entity.fee = event.params.fee;
  entity.save();
}

export function handleLnProviderUpdated(event: LnProviderUpdated): void {
  let counter = LnNonceOrder.load(marginUpdateNonce);
  if (counter == null) {
      counter = new LnNonceOrder(marginUpdateNonce);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.remoteChainId = event.params.remoteChainId.toI32();
  relayEntity.nonce = counter.count;
  relayEntity.updateType = PROVIDER_UPDATE;
  relayEntity.provider = event.params.provider;
  relayEntity.sourceToken = event.params.sourceToken;
  relayEntity.targetToken = event.params.targetToken;
  relayEntity.transactionHash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.margin;
  relayEntity.baseFee = event.params.baseFee;
  relayEntity.liquidityFeeRate = event.params.liquidityfeeRate;
  relayEntity.save();
}

export function handleLiquidityWithdrawn(event: LiquidityWithdrawn): void {
    let counter = LnNonceOrder.load(marginUpdateNonce);
  if (counter == null) {
      counter = new LnNonceOrder(marginUpdateNonce);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.remoteChainId = event.params.remoteChainId.toI32();
  relayEntity.nonce = counter.count;
  relayEntity.updateType = WITHDRAW;
  relayEntity.provider = event.params.provider;
  relayEntity.sourceToken = event.params.sourceToken;
  relayEntity.targetToken = event.params.targetToken;
  relayEntity.transactionHash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.amount;
  relayEntity.save();
}

export function handleSlash(event: Slash): void {
  let counter = LnNonceOrder.load(marginUpdateNonce);
  if (counter == null) {
      counter = new LnNonceOrder(marginUpdateNonce);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.remoteChainId = event.params.remoteChainId.toI32();
  relayEntity.nonce = counter.count;
  relayEntity.updateType = SLASH;
  relayEntity.provider = event.params.provider;
  relayEntity.sourceToken = event.params.sourceToken;
  relayEntity.targetToken = event.params.targetToken;
  relayEntity.transactionHash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.margin = event.params.margin;
  relayEntity.save();
}
// source chain end

// target chain start
export function handleTransferFilled(event: TransferFilled): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2RelayRecord(message_id);
  }
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.fee = event.receipt!.gasUsed * event.transaction.gasPrice;
  entity.save();
}
// target chain end

