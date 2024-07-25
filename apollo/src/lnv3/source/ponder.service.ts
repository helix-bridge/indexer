import axios from 'axios';
import {
  Lnv3Record,
  Lnv3UpdateRecords,
  Lnv3RelayRecord,
  Lnv3WithdrawStatus,
  SourceService,
} from './source.service';

export class Lnv3PonderService extends SourceService {
  async queryRecordInfo(url: string, localId: number, latestNonce: number): Promise<Lnv3Record[]> {
    const query = `query { lnv3TransferRecords(limit: 20, orderBy: "nonce", orderDirection: "asc", where: {localChainId: "${localId}", nonce_gt: "${latestNonce}"}) { items { id, nonce, messageNonce, remoteChainId, provider, sourceToken, targetToken, sourceAmount, targetAmount, sender, receiver, timestamp, transactionHash, fee, transferId, hasWithdrawn } }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3TransferRecords.items);
  }

  async queryProviderInfo(
    url: string,
    localId: number,
    latestNonce: number
  ): Promise<Lnv3UpdateRecords[]> {
    const query = `query { lnv3RelayUpdateRecords(limit: 20, orderBy: "nonce", orderDirection: "asc", where: {localChainId: "${localId}", nonce_gt: "${latestNonce}"}) { items { id, updateType, remoteChainId, provider, transactionHash, timestamp, sourceToken, targetToken, penalty, baseFee, liquidityFeeRate, transferLimit, paused } }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3RelayUpdateRecords.items);
  }

  async queryRelayStatus(
    url: string,
    localId: number,
    transferId: string
  ): Promise<Lnv3RelayRecord> {
    const id = `${localId}-${transferId}`;
    const query = `query { lnv3RelayRecord(id: "${id}") { id, relayer, timestamp, transactionHash, slashed, requestWithdrawTimestamp, fee }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3RelayRecord);
  }
  async queryMultiRelayStatus(
    url: string,
    chainId: number,
    transferIds: string[]
  ): Promise<Lnv3RelayRecord[]> {
    return [];
  }
  async batchQueryRelayStatus(
    url: string,
    localId: number,
    latestTimestamp: number
  ): Promise<Lnv3RelayRecord[]> {
    const query = `query { lnv3RelayRecords(limit: 20, orderBy: "timestamp", orderDirection: "asc", where: {localChainId: "${localId}", slashed: false, timestamp_gt: "${latestTimestamp}"}) { items { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3RelayRecords.items);
  }
  async queryWithdrawStatus(
    url: string,
    localId: number,
    transferId: string
  ): Promise<Lnv3WithdrawStatus> {
    const id = `${localId}-${transferId}`;
    const query = `query { lnv3TransferRecord(id: "${id}") { id, hasWithdrawn }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3TransferRecord);
  }
}
