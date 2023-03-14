import { ByteArray, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
    TicketCreated,
    RedeemScheduled
} from "../generated/ArbRetryableTx/ArbRetryableTx"
import { L1ToL2RelayRecord } from "../generated/schema"

const helixDaoAddress = '0x3b9e571adecb0c277486036d6097e9c2cccfa9d9';

function parseTransactionParams(types: string, input: Bytes): ethereum.Value | null {
  const functionInput = input.subarray(4);
  const tuplePrefix = ByteArray.fromHexString(
      '0x0000000000000000000000000000000000000000000000000000000000000020'
  );
  const functionInputAsTuple = new Uint8Array(
      tuplePrefix.length + functionInput.length
  );
  functionInputAsTuple.set(tuplePrefix, 0);
  functionInputAsTuple.set(functionInput, tuplePrefix.length);
  const tupleInputBytes = Bytes.fromUint8Array(functionInputAsTuple);
  return ethereum.decode(
      types,
      tupleInputBytes
  );
}

export function handleTicketCreated(event: TicketCreated): void {
  const types = '(bytes32,uint256,uint256,uint256,uint256,uint64,uint256,address,address,address,bytes)';
  const decoded = parseTransactionParams(types, event.transaction.input);
  if (decoded === null) {
      return;
  }
  const txParams = decoded.toTuple();
  const reqId = txParams[0];
  const refundAddress = txParams[7].toAddress();
  // filter helix record by refund address
  if (refundAddress.toHexString() != helixDaoAddress) {
      return;
  }

  let message_id = event.params.ticketId.toHexString();
  let entity = L1ToL2RelayRecord.load(message_id);
  if (entity == null) {
      entity = new L1ToL2RelayRecord(message_id);
      entity.transaction_hash = event.transaction.hash;
      entity.timestamp = event.block.timestamp;
      entity.nonce = reqId.toBytes().toHexString();
      entity.failure = true;
      entity.save();
  }
}

export function handleRedeemScheduled(event: RedeemScheduled): void {
  const types = '(bytes32,uint256,uint256,uint256,uint256,uint64,uint256,address,address,address,bytes)';
  const decoded = parseTransactionParams(types, event.transaction.input);
  // it's redeem
  if (decoded === null) {
      const types = '(bytes32)';
      const decoded = parseTransactionParams(types, event.transaction.input);
      if (decoded === null) {
          return;
      }
      const txParams = decoded.toTuple();
      const tickedId = txParams[0];
      let entity = L1ToL2RelayRecord.load(tickedId.toBytes().toHexString());
      if (entity == null) {
          // never
          return;
      }
      entity.failure = false;
      entity.transaction_hash = event.transaction.hash;
      entity.timestamp = event.block.timestamp;
      entity.save();
  } else {
      // it's autoredeem
      const txParams = decoded.toTuple();
      const reqId = txParams[0];
      const refundAddress = txParams[7].toAddress();
      // filter helix record by refund address
      if (refundAddress.toHexString() != helixDaoAddress) {
          return;
      }

      let message_id = event.params.ticketId.toHexString();
      let entity = L1ToL2RelayRecord.load(message_id);
      if (entity == null) {
          entity = new L1ToL2RelayRecord(message_id);
      }
      entity.transaction_hash = event.transaction.hash;
      entity.timestamp = event.block.timestamp;
      entity.nonce = reqId.toBytes().toHexString();
      entity.failure = false;
      entity.save();
  }
}

