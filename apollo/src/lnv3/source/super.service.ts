import axios from 'axios';
import {
  Lnv3Record,
  Lnv3UpdateRecords,
  Lnv3RelayRecord,
  Lnv3WithdrawStatus,
  SourceService,
} from './source.service';

export class Lnv3SuperService extends SourceService {
  async queryRecordInfo(url: string, chainId: number, latestNonce: number): Promise<Lnv3Record[]> {
    const query = `query { lnv3TransferRecords(first: 20, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}, where: {localChainId: ${chainId}}) { id, nonce, messageNonce, remoteChainId, provider, sourceToken, targetToken, sourceAmount, targetAmount, sender, receiver, timestamp, transactionHash, fee, transferId, hasWithdrawn } }`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      }, { timeout: 10000 })
      .then((res) => res.data?.data?.lnv3TransferRecords);
  }

  async queryProviderInfo(
    url: string,
    chainId: number,
    latestNonce: number
  ): Promise<Lnv3UpdateRecords[]> {
    const query = `query { lnv3RelayUpdateRecords(first: 20, orderBy: nonce, orderDirection: asc, skip: ${latestNonce}, where: {localChainId: ${chainId}}) { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, penalty, baseFee, liquidityFeeRate, transferLimit, paused } }`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      }, { timeout: 10000 })
      .then((res) => res.data?.data?.lnv3RelayUpdateRecords);
  }
  async queryRelayStatus(
    url: string,
    chainId: number,
    transferId: string
  ): Promise<Lnv3RelayRecord> {
    const query = `query { lnv3RelayRecord(id: "${transferId}") { id, relayer, timestamp, transactionHash, slashed, requestWithdrawTimestamp, fee }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      }, { timeout: 10000 })
      .then((res) => res.data?.data?.lnv3RelayRecord);
  }
  async queryMultiRelayStatus(
    url: string,
    chainId: number,
    transferIds: string[]
  ): Promise<Lnv3RelayRecord[]> {
    const idArray = '["' + transferIds.join('","') + '"]';
    const query = `query { lnv3RelayRecords(first: 20, where: {id_in: ${idArray}, localChainId: ${chainId}}) { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      }, { timeout: 10000 })
      .then((res) => res.data?.data?.lnv3RelayRecords);
  }
  async batchQueryRelayStatus(
    url: string,
    chainId: number,
    latestTimestamp: number
  ): Promise<Lnv3RelayRecord[]> {
    const query = `query { lnv3RelayRecords(first: 20, orderBy: timestamp, orderDirection: asc, where: {timestamp_gt: ${latestTimestamp}, localChainId: ${chainId}, slashed: false}) { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }`;

    return await axios
      .post(url, {
        query: query,
        variables: null,
      }, { timeout: 10000 })
      .then((res) => res.data?.data?.lnv3RelayRecords);
  }
  async queryWithdrawStatus(
    url: string,
    chainId: number,
    transferId: string
  ): Promise<Lnv3WithdrawStatus> {
    const query = `query { lnv3TransferRecord(id: "${transferId}") { id, remoteChainId, hasWithdrawn }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      }, { timeout: 10000 })
      .then((res) => res.data?.data?.lnv3TransferRecord);
  }
}
