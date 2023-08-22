import { BigInt } from "@graphprotocol/graph-ts"
import {
    TokenLocked,
    LnProviderUpdated,
} from "../generated/LnDefaultBridgeSource/LnDefaultBridgeSource"
import { Lnv2TransferRecord, Lnv2TransferRecordCounter, Lnv2RelayUpdateRecord } from "../generated/schema"

const PROVIDER_UPDATE = 0;

export function handleTokenLocked(event: TokenLocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = Lnv2TransferRecord.load(message_id);
  if (entity == null) {
      entity = new Lnv2TransferRecord(message_id);
  }

  let counter = Lnv2TransferRecordCounter.load("0x01");
  if (counter == null) {
      counter = new Lnv2TransferRecordCounter("0x01");
      counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count + BigInt.fromI32(1);
  counter.save();

  entity.sender = event.transaction.from;
  entity.receiver = event.params.receiver;
  entity.provider = event.params.provider;
  entity.token = event.params.sourceToken;
  entity.amount = event.params.amount;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.params.timestamp;
  entity.messageNonce = counter.count;
  entity.fee = event.params.fee;
  entity.save();
}

export function handleLnProviderUpdated(event: LnProviderUpdated): void {
  let id = event.transaction.hash.toHexString();
  let relayEntity = Lnv2RelayUpdateRecord.load(id);
  if (relayEntity == null) {
      relayEntity = new Lnv2RelayUpdateRecord(id);
  }
  relayEntity.updateType = PROVIDER_UPDATE;
  relayEntity.provider = event.transaction.from;
  relayEntity.token = event.params.sourceToken;
  relayEntity.transaction_hash = event.transaction.hash;
  relayEntity.timestamp = event.block.timestamp;
  relayEntity.baseFee = event.params.baseFee;
  relayEntity.liquidityFeeRate = event.params.liquidityfeeRate;
  relayEntity.save();
}

