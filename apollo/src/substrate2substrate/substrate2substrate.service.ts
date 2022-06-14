import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { isEmpty, omitBy } from 'lodash';
import {
  BurnRecordEntity,
  DailyStatistic,
  DVMLockRecord,
  S2sEvent,
  S2sRecord,
  UnlockRecord,
} from '../graphql';

interface RecordsRequest {
  first: number;
  startTime: number;
  sender?: string;
  recipient?: string;
}

@Injectable()
export class Substrate2substrateService {
  readonly backingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_BACKING');

  readonly issuingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_ISSUING');

  private readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(private configService: ConfigService) {}

  private get issuingChain() {
    return this.isTest ? 'pangoro' : 'darwinia';
  }

  private get backingChain() {
    return this.isTest ? 'pangolin' : 'crab';
  }

  private get lockFeeToken() {
    return this.isTest ? 'PRing' : 'Ring';
  }

  private get burnFeeToken() {
    return this.isTest ? 'PRing' : 'Crab';
  }

  private toISOString(timestamp: number) {
    return new Date(timestamp * 1000).toISOString().slice(0, 19);
  }

  private burnRecordToS2SRecord(burnRecord: BurnRecordEntity | null): S2sRecord {
    return (
      burnRecord && {
        id: burnRecord.id,
        fromChain: this.backingChain + '-dvm',
        toChain: this.issuingChain,
        bridge: 'helix',
        laneId: burnRecord.lane_id,
        nonce: burnRecord.nonce,
        requestTxHash: burnRecord.request_transaction,
        responseTxHash: burnRecord.response_transaction,
        sender: burnRecord.sender,
        recipient: burnRecord.recipient,
        token: burnRecord.token,
        amount: burnRecord.amount,
        startTime: burnRecord.start_timestamp,
        endTime: burnRecord.end_timestamp,
        result: burnRecord.result,
        fee: burnRecord.fee.toString(),
        feeToken: this.burnFeeToken,
      }
    );
  }

  private s2sEventTos2sRecord(s2sEvent: S2sEvent | null): S2sRecord {
    return (
      s2sEvent && {
        id: s2sEvent.id,
        fromChain: this.issuingChain,
        toChain: this.backingChain + '-dvm',
        bridge: 'helix',
        laneId: s2sEvent.laneId,
        nonce: s2sEvent.nonce,
        requestTxHash: s2sEvent.requestTxHash,
        responseTxHash: s2sEvent.responseTxHash,
        sender: s2sEvent.senderId,
        recipient: s2sEvent.recipient,
        token: s2sEvent.token,
        amount: s2sEvent.amount,
        startTime: getUnixTime(new Date(s2sEvent.startTimestamp)),
        endTime: getUnixTime(new Date(s2sEvent.endTimestamp)),
        result: s2sEvent.result,
        fee: s2sEvent.fee,
        feeToken: this.lockFeeToken,
      }
    );
  }

  /* ---------------------------------------- the graph section --------------------------------- */

  private async indexBurnRecordEntities({
    first,
    startTime,
    sender,
    recipient,
  }: RecordsRequest): Promise<{ data: { burnRecordEntities: BurnRecordEntity[] } }> {
    const accountQuery = this.theGraphAccountFilter({ sender, recipient });
    let filter = `start_timestamp_lt: ${startTime}`;

    if (accountQuery) {
      filter = `${filter}, ${accountQuery}`;
    }

    try {
      const res = await axios.post(this.backingUrl, {
        query: `query { burnRecordEntities (first: ${first}, orderBy: nonce, orderDirection: desc, where: { ${filter} }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
        variables: null,
      });

      return res.data;
    } catch {
      throw new HttpException('Query burn records failed', 500);
    }
  }

  private async indexMappingDailyStatistics(
    filter: string
  ): Promise<{ data: { burnDailyStatistics: DailyStatistic[] } }> {
    try {
      const res = await axios.post(this.backingUrl, {
        query: `query { burnDailyStatistics (orderBy: id, orderDirection: desc, ${filter}) {id, dailyVolume, dailyCount}}`,
        variables: null,
      });

      return res.data;
    } catch {
      throw new HttpException(`Query burn daily statistics failed, filter: ${filter}`, 500);
    }
  }

  async burnRecordEntities(request: RecordsRequest) {
    const data = await this.indexBurnRecordEntities(request);

    return data.data.burnRecordEntities;
  }

  async burnRecord(id: string): Promise<S2sRecord> {
    try {
      const res = await axios.post(this.backingUrl, {
        query: `query { burnRecordEntity(id: "${id}") {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`,
        variables: null,
      });

      return this.burnRecordToS2SRecord(res.data.data.burnRecordEntity);
    } catch {
      throw new HttpException(`Query burn record failed`, 500);
    }
  }

  async dvmLockedRecord(id: string): Promise<DVMLockRecord | null> {
    try {
      const res = await axios.post(this.backingUrl, {
        query: `query { lockRecordEntity(id: "${id}") { id, lane_id, nonce, mapping_token, recipient, amount, transaction } }`,
        variables: null,
      });

      const data = res.data.data.lockRecordEntity;

      if (!data) {
        return null;
      }

      const { lane_id, nonce, mapping_token, recipient, amount, transaction } = data;

      return {
        id,
        laneId: lane_id,
        nonce,
        token: mapping_token,
        recipient,
        amount,
        txHash: transaction,
      };
    } catch {
      throw new HttpException(`Query lock record entity failed`, 500);
    }
  }

  /* ---------------------------------------- subql section --------------------------------- */

  async indexLockRecords({
    first,
    startTime,
    sender,
    recipient,
  }: RecordsRequest): Promise<{ data: { s2sEvents: { nodes: S2sEvent[] } } }> {
    const startTimeQuery = `startTimestamp: { lessThan: \"${new Date(
      startTime * 1000
    ).toISOString()}\" }`;
    const accountQuery = this.subqlAccountFilter({ sender, recipient });

    const filter = accountQuery
      ? `filter: { ${startTimeQuery}, ${accountQuery} }`
      : `filter: { ${startTimeQuery} }`;

    try {
      const res = await axios.post(this.issuingUrl, {
        query: `query { s2sEvents (first: ${first}, orderBy: NONCE_DESC, ${filter}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`,
        variables: null,
      });

      return res.data;
    } catch {
      throw new HttpException(`Query lock records failed, filter: ${filter}`, 500);
    }
  }

  async indexIssuingDailyStatistics(
    filter: string
  ): Promise<{ data: { s2sDailyStatistics: { nodes: DailyStatistic[] } } }> {
    try {
      const res = await axios.post(this.issuingUrl, {
        query: `query { s2sDailyStatistics (orderBy: ID_DESC, ${filter}) {nodes{id, dailyVolume, dailyCount}}}`,
        variables: null,
      });

      return res.data;
    } catch {
      throw new HttpException(`Query s2s daily statistics failed, filter: ${filter}`, 500);
    }
  }

  async lockRecordEntities(request: RecordsRequest): Promise<S2sEvent[]> {
    const data = await this.indexLockRecords(request);

    return data.data.s2sEvents.nodes;
  }

  async lockRecord(id: string): Promise<S2sRecord> {
    try {
      const res = await axios.post(this.issuingUrl, {
        query: `query { s2sEvent(id: "${id}") {id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}`,
        variables: null,
      });

      return this.s2sEventTos2sRecord(res.data.data.s2sEvent);
    } catch {
      throw new HttpException(`Query s2s event failed`, 500);
    }
  }

  async unlockRecord(id: string): Promise<UnlockRecord | null> {
    try {
      const res = await axios.post(this.issuingUrl, {
        query: `query { s2sUnlocked(id: "${id}") { id, laneId, nonce, txHash, recipient, token, amount, timestamp, block } }`,
        variables: null,
      });

      const data = res.data.data.s2sUnlocked;

      if (!data) {
        return null;
      }

      const { timestamp, ...rest } = data;

      return { ...rest, timestamp: getUnixTime(new Date(timestamp)) };
    } catch {
      throw new HttpException(`Query s2s unlock failed`, 500);
    }
  }

  /* ---------------------------------------- public api --------------------------------- */

  async s2sRecords(request: RecordsRequest): Promise<S2sRecord[]> {
    const { first } = request;

    const [burnRecords, lockRecords] = await Promise.all([
      this.indexBurnRecordEntities(request),
      this.indexLockRecords(request),
    ]);

    const s2sRecordList = [];
    const left = burnRecords.data?.burnRecordEntities ?? [];
    const right = lockRecords.data?.s2sEvents.nodes ?? [];

    while (left.length && right.length) {
      const record =
        this.toISOString(left[0].start_timestamp) >= right[0].startTimestamp
          ? this.burnRecordToS2SRecord(left.shift())
          : this.s2sEventTos2sRecord(right.shift());

      s2sRecordList.push(record);

      if (s2sRecordList.length >= first) {
        return s2sRecordList;
      }
    }

    const more = left.length > 0 ? left : right;
    const convert = left.length > 0 ? this.burnRecordToS2SRecord : this.s2sEventTos2sRecord;

    for (const idx in more) {
      if (Object.prototype.hasOwnProperty.call(more, idx)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        s2sRecordList.push(convert(more[idx]));

        if (s2sRecordList.length >= first) {
          return s2sRecordList;
        }
      }
    }

    return s2sRecordList;
  }

  // TODO store volumes for different asset and use price oracle to transform into dollar value
  async dailyStatistics({ first, timepast, chain }): Promise<DailyStatistic[]> {
    const now = Date.now() / 1000;
    const timelimit = Math.floor(now - timepast);
    const filterBurnDaily = `where: {id_gte: ${timelimit}}`;
    const filterLockDaily = `filter: {id: {greaterThanOrEqualTo: \"${timelimit}\"}}`;

    if (chain === this.issuingChain) {
      const dailyStatistics = await this.indexMappingDailyStatistics(filterBurnDaily);

      return dailyStatistics.data.burnDailyStatistics;
    } else if (chain === this.backingChain) {
      const dailyStatistics = await this.indexIssuingDailyStatistics(filterLockDaily);

      return dailyStatistics.data.s2sDailyStatistics.nodes;
    }

    const [s2sBurnDaily, s2sLockDaily] = await Promise.all([
      this.indexMappingDailyStatistics(filterBurnDaily),
      this.indexIssuingDailyStatistics(filterLockDaily),
    ]);

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

  theGraphAccountFilter(req: Pick<RecordsRequest, 'sender' | 'recipient'>): string | undefined {
    const data = omitBy(req, (value) => !value);

    return isEmpty(data)
      ? undefined
      : Object.entries(data)
          .map(([key, value]) => `${key}: "${value}"`)
          .join(', ');
  }

  subqlAccountFilter({
    sender,
    recipient,
  }: Pick<RecordsRequest, 'sender' | 'recipient'>): string | undefined {
    const senderQuery = `senderId: { equalTo: "${sender}" }`;
    const recipientQuery = `recipient: { equalTo: "${recipient}" }`;
    let accountQuery: string;

    if (sender && recipient) {
      accountQuery = `or: [ { ${senderQuery} }, { ${recipientQuery} } ]`;
    } else if (sender || recipient) {
      accountQuery = [senderQuery, recipientQuery].find((item) => /0x\w+/.test(item));
    }

    return accountQuery;
  }
}
