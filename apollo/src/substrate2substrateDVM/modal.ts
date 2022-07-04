// eslint-disable-next-line no-magic-numbers
export type Result = 0 | 1 | 2; // 0 TokenLocked 1 TokenLockedConfirmed success 2 TokenLockedConfirmed fail

export interface SubstrateDVM2SubstrateRecord {
  id: string;
  lane_id: string;
  nonce: string;
  request_transaction: string;
  response_transaction: string;
  sender: string;
  recipient: string;
  token: string;
  amount: string;
  result: Result;
  start_timestamp: string;
  end_timestamp: string;
  fee: string;
}

export interface Substrate2SubstrateDVMRecord {
  id: string;
  laneId: string;
  nonce: string;
  requestTxHash: string;
  responseTxHash: string;
  senderId: string;
  recipient: string;
  token: string;
  amount: string;
  result: Result;
  startTimestamp: string;
  endTimestamp: string;
  fee: string;
}
