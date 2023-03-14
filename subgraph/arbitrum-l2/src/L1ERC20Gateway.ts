import { ByteArray, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
    DepositInitiated
} from "../generated/L1ERC20Gateway/L1ERC20Gateway"
import { L1ToL2TransferRecord } from "../generated/schema"

const helixDaoAddress = '0x3b9e571adecb0c277486036d6097e9c2cccfa9d9';

export function handleDepositInitiated(event: DepositInitiated): void {
  let message_id = event.params._sequenceNumber.toHexString();
  let entity = L1ToL2TransferRecord.load(message_id);
  if (entity == null) {
      entity = new L1ToL2TransferRecord(message_id);
  }

  entity.sender = event.params._from;
  entity.receiver = event.params._to;
  entity.token = event.params.l1Token;
  entity.amount = event.params._amount;
  entity.transaction_hash = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.fee = event.transaction.value;

  const functionInput = event.transaction.input.subarray(4);
  const tuplePrefix = ByteArray.fromHexString(
      '0x0000000000000000000000000000000000000000000000000000000000000020'
  );
  const functionInputAsTuple = new Uint8Array(
      tuplePrefix.length + functionInput.length
  );
  functionInputAsTuple.set(tuplePrefix, 0);
  functionInputAsTuple.set(functionInput, tuplePrefix.length);
  const tupleInputBytes = Bytes.fromUint8Array(functionInputAsTuple);
  const decoded = ethereum.decode(
      '(address,address,address,uint256,uint256,uint256,bytes)',
      tupleInputBytes
  );
  if (decoded === null) {
      return;
  }
  const txParams = decoded.toTuple();
  const refundAddress = txParams[1].toAddress();
  // filter helix record by refund address
  if (refundAddress.toHexString() != helixDaoAddress) {
      return;
  }
  entity.save();
}

