import { BigInt } from "@graphprotocol/graph-ts"
import {
    TokenLocked,
    LnProviderUpdated,
    PenaltyReserveUpdated,
    SlashRequest,
    TransferFilled,
    LnProviderPaused,
    LiquidityWithdrawn,
    LiquidityWithdrawRequested,
} from "../generated/HelixLnBridgeV3/HelixLnBridgeV3"
import { Lnv3TransferRecord, Lnv3RelayRecord, LnNonceOrder, Lnv3RelayUpdateRecord, Lnv3PenaltyReserve } from "../generated/schema"

const PROVIDER_UPDATE = 0;
const PAUSE_UPDATE = 1;

const lockRecordNonceId = "0x01";
const providerUpdateNonce = "0x02";

// target chain
// order is not needed, query by transferId
export function handleTransferFilled(event: TransferFilled): void {
  let messageId = event.params.transferId.toHexString();
  let entity = Lnv3RelayRecord.load(messageId);
  if (entity == null) {
      entity = new Lnv3RelayRecord(messageId);
  }
  entity.timestamp = event.block.timestamp;
  entity.relayer = event.params.provider;
  entity.transactionHash = event.transaction.hash;
  entity.slashed = false;
  entity.save();
}

export function handleSlashRequest(event: SlashRequest): void {
  let messageId = event.params.transferId.toHexString();
  let entity = Lnv3RelayRecord.load(messageId);
  if (entity == null) {
      entity = new Lnv3RelayRecord(messageId);
  }
  entity.timestamp = event.block.timestamp;
  entity.relayer = event.params.provider;
  entity.transactionHash = event.transaction.hash;
  entity.slashed = true;
  entity.save();
}

export function handleLiquidityWithdrawRequested(event: LiquidityWithdrawRequested): void {
  for (let i = 0; i < event.params.transferIds.length; i++) {
    const transferId = event.params.transferIds[i];
    let entity = Lnv3RelayRecord.load(transferId.toHexString());
    if (entity == null) {
      return;
    }
    entity.requestWithdrawTimestamp = event.block.timestamp;
    entity.save();
  }
}
// **************** target chain end ******************

// **************** source chain start ****************
export function handleTokenLocked(event: TokenLocked): void {
  let transferId = event.params.transferId.toHexString();
  let entity = Lnv3TransferRecord.load(transferId);
  if (entity == null) {
      entity = new Lnv3TransferRecord(transferId);
  }

  let counter = LnNonceOrder.load(lockRecordNonceId);
  if (counter == null) {
      counter = new LnNonceOrder(lockRecordNonceId);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  entity.nonce = counter.count;
  entity.messageNonce = event.params.params.timestamp;
  entity.remoteChainId = event.params.params.remoteChainId.toI32();
  entity.provider = event.params.params.provider;
  entity.sourceToken = event.params.params.sourceToken;
  entity.targetToken = event.params.params.targetToken;
  entity.sourceAmount = event.params.params.amount;
  entity.targetAmount = event.params.targetAmount;
  entity.sender = event.transaction.from;
  entity.receiver = event.params.params.receiver;
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.fee = event.params.fee;
  entity.transferId = event.params.transferId;
  entity.save();
}

export function handleLiquidityWithdrawn(event: LiquidityWithdrawn): void {
  for (let i = 0; i < event.params.transferIds.length; i++) {
    const transferId = event.params.transferIds[i];
    let entity = Lnv3TransferRecord.load(transferId.toHexString());
    if (entity == null) {
      return;
    }
    entity.hasWithdrawn = true;
    entity.save();
  }
}

export function handleLnProviderUpdated(event: LnProviderUpdated): void {
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv3RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv3RelayUpdateRecord(id);
  }

  let counter = LnNonceOrder.load(providerUpdateNonce);
  if (counter == null) {
      counter = new LnNonceOrder(providerUpdateNonce);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  relayEntity.remoteChainId = event.params.remoteChainId.toI32();
  relayEntity.nonce = counter.count;
  relayEntity.updateType = PROVIDER_UPDATE;
  relayEntity.provider = event.params.provider;
  relayEntity.sourceToken = event.params.sourceToken;
  relayEntity.targetToken = event.params.targetToken;
  relayEntity.transactionHash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.baseFee = event.params.baseFee;
  relayEntity.liquidityFeeRate = event.params.liquidityfeeRate;
  relayEntity.transferLimit = event.params.transferLimit;
  relayEntity.save();
}

export function handlePenaltyReserveUpdated(event: PenaltyReserveUpdated): void {
  const provider = event.params.provider;
  const sourceToken = event.params.provider;
  let id = `${provider.toHexString()}-${sourceToken.toHexString()}`;
  let entity = Lnv3PenaltyReserve.load(id);
  if (entity == null) {
      entity = new Lnv3PenaltyReserve(id);
  }
  entity.provider = provider;
  entity.sourceToken = sourceToken;
  entity.penaltyReserved = event.params.updatedPanaltyReserve;
  entity.save();
}

export function handleLnProviderPaused(event: LnProviderPaused): void {
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv3RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv3RelayUpdateRecord(id);
  }

  let counter = LnNonceOrder.load(providerUpdateNonce);
  if (counter == null) {
      counter = new LnNonceOrder(providerUpdateNonce);
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  relayEntity.remoteChainId = event.params.remoteChainId.toI32();
  relayEntity.nonce = counter.count;
  relayEntity.updateType = PAUSE_UPDATE;
  relayEntity.provider = event.params.provider;
  relayEntity.sourceToken = event.params.sourceToken;
  relayEntity.targetToken = event.params.targetToken;
  relayEntity.transactionHash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.paused = event.params.paused;
  relayEntity.save();
}
// **************** source chain end ****************

