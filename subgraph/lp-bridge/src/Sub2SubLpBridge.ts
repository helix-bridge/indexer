import { BigInt } from "@graphprotocol/graph-ts"
import {
    TokenLocked,
    FeeUpdated,
    TransferRelayed,
    LiquidityWithdrawn
} from "../generated/Sub2SubLpBridge/Sub2SubLpBridge"
import { LpTransferRecord, LpRelayRecord } from "../generated/schema"

export function handleTokenLocked(event: TokenLocked): void {
  let message_id = event.params.transferId.toHexString();
  let entity = LpTransferRecord.load(message_id);
  if (entity == null) {
      entity = new LpTransferRecord(message_id);
  }

  entity.sender = event.transaction.from;
  entity.receiver = event.params.receiver;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.fee = event.params.fee;
  entity.is_native = event.params.isNative;
  entity.issuing_native = event.params.issuingNative;
  entity.nonce = event.params.nonce;
  entity.remote_chainid = event.params.toChainId;
  entity.save();
}

export function handelFeeUpdated(event: FeeUpdated): void {
    let message_id = event.params.transferId.toHexString();
    let entity = LpTransferRecord.load(message_id);
    if (entity == null) {
        return;
    }
    entity.fee = event.params.fee;
    entity.save();
}

export function handleLiquidityWithdrawn(event: LiquidityWithdrawn): void {
  let id = event.params.transferId.toHexString();
  let entity = LpTransferRecord.load(id);
  if (entity == null) {
      return;
  }
  entity.liquidate_withdrawn_sender = event.params.receiver;
  entity.liquidate_transaction_hash = event.transaction.hash;
  entity.liquidate_withdrawn_timestamp = event.block.timestamp;
  entity.save();
}

export function handleTransferRelayed(event: TransferRelayed): void {
let message_id = event.params.transferId.toHexString();
  let entity = LpRelayRecord.load(message_id);
  if (entity == null) {
      entity = new LpRelayRecord(message_id);
  }
  entity.relayer = event.params.relayer;
  entity.timestamp = event.block.timestamp;
  entity.transaction_hash = event.transaction.hash;
  entity.save();
}

