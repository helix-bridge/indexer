import axios from 'axios';
import {
  Lnv3Record,
  Lnv3UpdateRecords,
  Lnv3RelayRecord,
  Lnv3WithdrawStatus,
  SourceService,
} from './source.service';

export class Lnv3PonderService extends SourceService {
  async queryRecordInfo(
    url: string,
    localId: number,
    latestNonce: number,
    limit: number
  ): Promise<Lnv3Record[]> {
    const query = `query { lnv3TransferRecords(limit: ${limit}, orderBy: "nonce", orderDirection: "asc", where: {localChainId: "${localId}", nonce_gt: "${latestNonce}"}) { items { id, nonce, messageNonce, remoteChainId, provider, sourceToken, targetToken, sourceAmount, targetAmount, sender, receiver, timestamp, transactionHash, fee, transferId, hasWithdrawn } }}`;
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
    localId: number,
    transferIds: string[]
  ): Promise<Lnv3RelayRecord[]> {
    const query = `query { lnv3RelayRecords(limit: 50, orderBy: "timestamp", orderDirection: "asc", where: {localChainId: "${localId}", id_in: ${transferIds} }) { items { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3RelayRecords.items);
  }
  async batchQueryRelayStatus(
    url: string,
    localId: number,
    cursor: bigint,
    limit: number
  ): Promise<Lnv3RelayRecord[]> {
    const query = `query { lnv3RelayRecords(limit: ${limit}, orderBy: "timestamp", orderDirection: "asc", where: {localChainId: "${localId}", slashed: false, nonce_gt: "${cursor}"}) { items { id, timestamp, requestWithdrawTimestamp, relayer, transactionHash, slashed, fee } }}`;
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
    const query = `query { lnv3TransferRecord(id: "${id}") { id, remoteChainId, hasWithdrawn }}`;
    return await axios
      .post(url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.lnv3TransferRecord);
  }
}
