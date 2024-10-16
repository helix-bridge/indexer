import axios from 'axios';
import {
  Lnv3Record,
  Lnv3UpdateRecords,
  Lnv3RelayRecord,
  Lnv3WithdrawStatus,
  SourceService,
} from './source.service';

export class Lnv3EnvioService extends SourceService {
  async queryRecordInfo(
    url: string,
    chainId: number,
    latestNonce: number,
    limit: number
  ): Promise<Lnv3Record[]> {
    const query = `query { Lnv3TransferRecord(limit: ${limit}, order_by: { nonce: asc }, offset: ${latestNonce}, where: {localChainId: {_eq: ${chainId}}}) { id, nonce, messageNonce, remoteChainId, provider, sourceToken, targetToken, sourceAmount, targetAmount, sender, receiver, timestamp, transactionHash, fee, transferId, hasWithdrawn } }`;
    return await axios
      .post(
        url,
        {
          query: query,
          variables: null,
        },
        { timeout: 10000 }
      )
      .then((res) => res.data?.data?.Lnv3TransferRecord);
  }

  async queryProviderInfo(
    url: string,
    chainId: number,
    latestNonce: number
  ): Promise<Lnv3UpdateRecords[]> {
    const query = `query { Lnv3RelayUpdateRecord(limit: 20, order_by: { nonce: asc }, offset: ${latestNonce}, where: {localChainId: {_eq: ${chainId}}}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, penalty, baseFee, liquidityFeeRate, transferLimit, paused } }`;
    return await axios
      .post(
        url,
        {
          query: query,
          variables: null,
        },
        { timeout: 10000 }
      )
      .then((res) => res.data?.data?.Lnv3RelayUpdateRecord);
  }
  async queryRelayStatus(
    url: string,
    chainId: number,
    transferId: string
  ): Promise<Lnv3RelayRecord> {
    const query = `query { Lnv3RelayRecord(where: { id: { _eq: "${transferId}" }, localChainId: {_eq: ${chainId}}}) { id, relayer, timestamp, transactionHash, slashed, requestWithdrawTimestamp, fee }}`;
    return await axios
      .post(
        url,
        {
          query: query,
          variables: null,
        },
        { timeout: 10000 }
      )
      .then((res) => res.data?.data?.Lnv3RelayRecord?.[0]);
  }
  async queryMultiRelayStatus(
    url: string,
    chainId: number,
    transferIds: string[]
  ): Promise<Lnv3RelayRecord[]> {
    const idArray = '["' + transferIds.join('","') + '"]';
    const query = `query { Lnv3RelayRecord(limit: 50, where: {id: { _in: ${idArray}}, localChainId: {_eq: ${chainId}}}) { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }`;
    return await axios
      .post(
        url,
        {
          query: query,
          variables: null,
        },
        { timeout: 10000 }
      )
      .then((res) => res.data?.data?.Lnv3RelayRecord);
  }
  async batchQueryRelayStatus(
    url: string,
    chainId: number,
    cursor: bigint,
    limit: number
  ): Promise<Lnv3RelayRecord[]> {
    const query = `query { Lnv3RelayRecord(limit: ${limit}, order_by: { timestamp: asc }, offset: ${cursor}, where: { localChainId: {_eq: ${chainId}}, slashed: { _eq: false }}) { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }`;
    return await axios
      .post(
        url,
        {
          query: query,
          variables: null,
        },
        { timeout: 10000 }
      )
      .then((res) => res.data?.data?.Lnv3RelayRecord);
  }
  async queryWithdrawStatus(
    url: string,
    chainId: number,
    transferId: string
  ): Promise<Lnv3WithdrawStatus> {
    const query = `query { Lnv3TransferRecord(where: { id: { _eq: "${transferId}" }, localChainId: {_eq: ${chainId}}}) { id, remoteChainId, hasWithdrawn }}`;
    return await axios
      .post(
        url,
        {
          query: query,
          variables: null,
        },
        { timeout: 10000 }
      )
      .then((res) => res.data?.data?.Lnv3TransferRecord?.[0]);
  }
}
