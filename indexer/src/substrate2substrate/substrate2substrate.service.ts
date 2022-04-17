import { Injectable } from '@nestjs/common';
import axios from 'axios';

const formatTimestamp = (timestamp) => new Date(timestamp * 1000).toISOString().slice(0, 19);

const burnRecordEntityTos2sRecords = (burnRecord) => ({
  id: burnRecord.id,
  fromChain: 'crab',
  fromChainMode: 'dvm',
  toChain: 'darwinia',
  toChainMode: 'native',
  bridge: 'helix',
  laneId: burnRecord.lane_id,
  nonce: burnRecord.nonce,
  requestTxHash: burnRecord.request_transaction,
  responseTxHash: burnRecord.response_transaction,
  sender: burnRecord.sender,
  recipient: burnRecord.recipient,
  token: burnRecord.token,
  amount: burnRecord.amount,
  startTime: formatTimestamp(burnRecord.start_timestamp),
  endTime: formatTimestamp(burnRecord.end_timestamp),
  result: burnRecord.result,
  fee: burnRecord.fee,
});

const s2sEventTos2sRecords = (s2sEvent) => ({
  id: s2sEvent.id,
  fromChain: 'darwinia',
  fromChainMode: 'native',
  toChain: 'crab',
  toChainMode: 'dvm',
  bridge: 'helix',
  laneId: s2sEvent.laneId,
  nonce: s2sEvent.nonce,
  requestTxHash: s2sEvent.requestTxHash,
  responseTxHash: s2sEvent.responseTxHash,
  sender: s2sEvent.senderId,
  recipient: s2sEvent.recipient,
  token: s2sEvent.token,
  amount: s2sEvent.amount,
  startTime: s2sEvent.startTimestamp,
  endTime: s2sEvent.endTimestamp,
  result: s2sEvent.result,
  fee: s2sEvent.fee,
});

@Injectable()
export class Substrate2substrateService {
  readonly backingUrl =
    'https://crab-thegraph.darwinia.network/subgraphs/name/wormhole/Sub2SubMappingTokenFactory';

  readonly issuingUrl = 'https://api.subquery.network/sq/darwinia-network/wormhole-darwinia';

  private async indexBurnRecordEntities(first, filter) {
    const res = await axios.post(this.backingUrl, {
      query: `query { burnRecordEntities (first: ${first}, orderBy: nonce, orderDirection: desc, ${filter}) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
      variables: null,
    });

    return res.data;
  }

  private async indexMappingDailyStatistics(filter) {
    const res = await axios.post(this.backingUrl, {
      query: `query { burnDailyStatistics (orderBy: id, orderDirection: desc, ${filter}) {id, dailyVolume, dailyCount}}`,
      variables: null,
    });

    return res.data;
  }

  async indexLockRecordEntities(first, filter) {
    const res = await axios.post(this.issuingUrl, {
      query: `query { s2sEvents (first: ${first}, orderBy: NONCE_DESC, ${filter}) {nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`,
      variables: null,
    });

    return res.data;
  }

  //https://api.subquery.network/sq/darwinia-network/wormhole-darwinia__ZGFyd
  async indexIssuingDailyStatistics(filter) {
    const res = await axios.post(this.issuingUrl, {
      query: `query { s2sDailyStatistics (orderBy: ID_DESC, ${filter}) {nodes{id, dailyVolume, dailyCount}}}`,
      variables: null,
    });

    return res.data;
  }

  async burnRecordEntities({ first, start_timestamp, sender, recipient }) {
    let filter = `start_timestamp_lt: ${start_timestamp}`;

    if (sender) {
      filter = `${filter}, sender: \"${sender}\"`;
    }

    if (recipient) {
      filter = `${filter}, recipient: \"${recipient}\"`;
    }

    filter = `where: { ${filter} }`;

    const data = await this.indexBurnRecordEntities(first, filter);

    return data.data.burnRecordEntities;
  }

  async lockRecordEntities({ first, start_timestamp, sender, recipient }) {
    const date = formatTimestamp(start_timestamp);
    let filter = `startTimestamp: {lessThan: \"${date}\"}`;

    if (sender) {
      filter = `${filter}, sender: {equalTo: \"${sender}\"}`;
    }

    if (recipient) {
      filter = `${filter}, recipient: {equalTo: \"${recipient}\"}`;
    }

    filter = `filter: { ${filter} }`;

    const data = await this.indexLockRecordEntities(first, filter);

    return data.data.s2sEvents.nodes;
  }

  async s2sRecords({ first, start_timestamp, sender }) {
    const date = formatTimestamp(start_timestamp);
    let filterBurn = `start_timestamp_lt: ${start_timestamp}`;
    let filterLock = `startTimestamp: {lessThan: \"${date}\"}`;

    if (sender) {
      filterBurn = `${filterBurn}, sender: \"${sender}\"`;
      filterLock = `${filterLock}, senderId: {equalTo: \"${sender}\"}`;
    }

    /**
     * subql filter: { or: [ { sender: { equalTo: $sender}}, { recipient: { equalTo: $recipient }}]}
     */
    filterBurn = `where: { ${filterBurn} }`;
    filterLock = `filter: { ${filterLock} }`;

    const burnRecords = await this.indexBurnRecordEntities(first, filterBurn);
    const lockRecords = await this.indexLockRecordEntities(first, filterLock);
    const s2sRecordList = [];
    const left = burnRecords.data.burnRecordEntities;
    const right = lockRecords.data.s2sEvents.nodes;

    while (left.length && right.length) {
      const record =
        formatTimestamp(left[0].start_timestamp) >= right[0].startTimestamp
          ? burnRecordEntityTos2sRecords(left.shift())
          : s2sEventTos2sRecords(right.shift());

      s2sRecordList.push(record);

      if (s2sRecordList.length >= first) {
        return s2sRecordList;
      }
    }

    const more = left.length > 0 ? left : right;
    const convert = left.length > 0 ? burnRecordEntityTos2sRecords : s2sEventTos2sRecords;

    for (const idx in more) {
      if (Object.prototype.hasOwnProperty.call(more, idx)) {
        s2sRecordList.push(convert(more[idx]));

        if (s2sRecordList.length >= first) {
          return s2sRecordList;
        }
      }
    }

    return s2sRecordList;
  }

  // TODO store volumes for different asset and use price oracle to transform into dollar value
  async dailyStatistics({ first, timepast, chain }) {
    const now = Date.now() / 1000;
    const timelimit = Math.floor(now - timepast);
    const filterBurnDaily = `where: {id_gte: ${timelimit}}`;
    const filterLockDaily = `filter: {id: {greaterThanOrEqualTo: \"${timelimit}\"}}`;

    if (chain === 'darwinia') {
      const dailyStatistics = await this.indexMappingDailyStatistics(filterBurnDaily);

      return dailyStatistics.data.burnDailyStatistics;
    } else if (chain === 'crab') {
      const dailyStatistics = await this.indexIssuingDailyStatistics(filterLockDaily);

      return dailyStatistics.data.s2sDailyStatistics.nodes;
    }

    const s2sBurnDaily = await this.indexMappingDailyStatistics(filterBurnDaily);
    const s2sLockDaily = await this.indexIssuingDailyStatistics(filterLockDaily);

    const left = s2sBurnDaily.data.burnDailyStatistics;
    const right = s2sLockDaily.data.s2sDailyStatistics.nodes;
    const records = [];
    let lastRecord;

    while (left.length && right.length) {
      const record = left[0].id >= right[0].id ? left.shift() : right.shift();

      if (!lastRecord) {
        lastRecord = record;
        continue;
      }

      if (lastRecord.id === record.id) {
        lastRecord.dailyVolume =
          global.BigInt(lastRecord.dailyVolume) + global.BigInt(record.dailyVolume);
        lastRecord.dailyCount += record.dailyCount;
        continue;
      } else {
        records.push(lastRecord);
        lastRecord = record;
      }

      if (first && records.length >= first) {
        return records;
      }
    }

    const more = left.length > 0 ? left : right;

    if (lastRecord && more.length > 0) {
      if (lastRecord.id === more[0].id) {
        more[0].dailyVolume =
          global.BigInt(more[0].dailyVolume) + global.BigInt(lastRecord.dailyVolume);
        more[0].dailyCount += lastRecord.dailyCount;
      } else {
        records.push(lastRecord);
      }
    }

    for (const idx in more) {
      if (Object.prototype.hasOwnProperty.call(more, idx)) {
        records.push(more[idx]);
        if (first && records.length >= first) {
          return records;
        }
      }
    }

    return records;
  }
}
