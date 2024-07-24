export interface Lnv3Record {
  id: string;
  nonce: string;
  messageNonce: string;
  remoteChainId: number;
  provider: string;
  sourceToken: string;
  sourceAmount: string;
  targetToken: string;
  targetAmount: string;
  sender: string;
  receiver: string;
  timestamp: string;
  transactionHash: string;
  fee: string;
  transferId: string;
  hasWithdrawn: boolean;
}

export interface Lnv3UpdateRecords {
  id: string;
  updateType: number;
  remoteChainId: number;
  provider: string;
  transactionHash: string;
  timestamp: string;
  sourceToken: string;
  targetToken: string;
  penalty: string;
  baseFee: string;
  liquidityFeeRate: number;
  transferLimit: string;
  paused: boolean;
}

export interface Lnv3RelayRecord {
  id: string;
  relayer: string;
  timestamp: string;
  transactionHash: string;
  slashed: boolean;
  requestWithdrawTimestamp: string;
  fee: string;
}

export interface Lnv3WithdrawStatus {
  id: string;
  hasWithdrawn: boolean;
  responseTxHash: string;
}

export abstract class SourceService {
  abstract queryRecordInfo(
    url: string,
    chainId: number,
    latestNonce: number
  ): Promise<Lnv3Record[]>;
  abstract queryProviderInfo(
    url: string,
    chainId: number,
    latestNonce: number
  ): Promise<Lnv3UpdateRecords[]>;
  abstract queryRelayStatus(
    url: string,
    chainId: number,
    transferId: string
  ): Promise<Lnv3RelayRecord>;
  abstract batchQueryRelayStatus(
    url: string,
    chainId: number,
    latestTimestamp: number
  ): Promise<Lnv3RelayRecord[]>;
  abstract queryWithdrawStatus(
    url: string,
    chainId: number,
    transferId: string
  ): Promise<Lnv3WithdrawStatus>;
}
