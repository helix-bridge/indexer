import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferService, Transfer, TransferAction } from '../base/TransferService';

@Injectable()
export class TransferService extends BaseTransferService {
  private readonly subql = this.configService.get<string>('SUBQL');
  private readonly subqlX = this.configService.get<string>('SUBQL_X');
  private readonly subqlS = this.configService.get<string>('SUBQL_S');
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_ISSUING');
  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_SUBSTRATE_BACKING');

  formalChainTransfers: Transfer[] = [
    {
      backing: { chain: 'darwinia', url: this.backingUrl, token: 'RING', feeToken: 'RING' },
      issuing: { chain: 'crab-dvm', url: this.issuingUrl, token: 'xRING', feeToken: 'CRAB' },
    },
  ];

  testChainTransfers: Transfer[] = [];

  dispatchEndPoints = {
    pangolin: this.subqlX + 'pchain',
    pangoro: this.subqlS + 'pochain',
    crab: this.subql + 'crab',
    darwinia: this.subql + 'darwinia',
  };

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
}
