import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferService, Transfer, TransferAction } from '../base/TransferService';

@Injectable()
export class TransferService extends BaseTransferService {
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_ISSUING');
  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_BACKING');

  formalChainTransfers: Transfer[] = [
    {
      from: { chain: 'darwinia', url: this.issuingUrl, token: 'RING', feeToken: 'RING' },
      to: { chain: 'crab-dvm', url: this.backingUrl, token: 'xRING', feeToken: 'RING' },
    },
  ];

  testChainTransfers: Transfer[] = [
    {
      from: { chain: 'pangoro', url: this.issuingUrl, token: 'ORING', feeToken: 'PRING' },
      to: { chain: 'pangolin-dvm', url: this.backingUrl, token: 'xORING', feeToken: 'PRING' },
    },
  ];

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(action: TransferAction, first: number, latestNonce: bigint | number) {
    return action === 'burn'
      ? `query { burnRecordEntities (first: ${first}, orderBy: nonce, orderDirection: asc, where: { nonce_gt: ${latestNonce} }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`
      : `query { s2sEvents (first: ${first}, orderBy: NONCE_ASC, filter: {nonce: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, laneId, nonce, amount, startTimestamp, endTimestamp, requestTxHash, responseTxHash, result, token, senderId, recipient, fee}}}`;
  }

  getConfirmRecordQueryString(action: TransferAction, nonces: string[]) {
    const nonceList = nonces.join(',');

    return action === 'burn'
      ? `query { burnRecordEntities (where: { nonce_in: [${nonceList}] }) {id, lane_id, nonce, amount, start_timestamp, end_timestamp, request_transaction, response_transaction, result, token, sender, recipient, fee}}`
      : `query { s2sEvents (filter: {nonce: {in: [${nonceList}]}}) { nodes{id, responseTxHash, result, endTimestamp }}}`;
  }

  getDailyStatisticsQueryString(action: TransferAction, latestDay: number) {
    return action === 'burn'
      ? `query { burnDailyStatistics (first: 10, orderBy: id, orderDirection: asc, where: {id_gt: "${latestDay}"}) {id, dailyVolume, dailyCount}}`
      : `query { s2sDailyStatistics (first: 10, orderBy: ID_ASC, filter: {id: {greaterThan: "${latestDay}"}}) {nodes{id, dailyVolume, dailyCount}}}`;
  }
}
