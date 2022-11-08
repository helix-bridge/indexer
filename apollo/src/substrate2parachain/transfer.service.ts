import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, TransferT3 } from '../base/TransferServiceT3';

@Injectable()
export class TransferService extends BaseTransferServiceT3 {
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_TO_PARACHAIN_ISSUING');
  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_TO_PARACHAIN_BACKING');
  private readonly subql = this.configService.get<string>('SUBQL');

  private readonly chain = this.configService.get<string>('PARACHAIN');

  formalChainTransfers: TransferT3[] = [
    {
      source: {
        chain: 'crab-dvm',
        url: this.backingUrl + '/crab',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'crab-parachain',
        url: this.issuingUrl + 'crab-parachain',
        feeToken: 'CRAB',
      },
      isLock: true,
      symbols: [],
    },
    {
      source: {
        chain: 'crab-parachain',
        url: this.issuingUrl + '/crab-parachain',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'crab-dvm',
        url: this.backingUrl + 'crab',
        feeToken: 'CRAB',
      },
      isLock: false,
      symbols: [],
    },
  ];

  testChainTransfers: TransferT3[] = [];

  dispatchEndPoints = {
    crab: this.subql + 'crab',
    darwinia: this.subql + 'crab-parachain',
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordFromThegraph(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: start_timestamp, orderDirection: asc, skip: ${latestNonce}) {id, sender, receiver, token, amount, fee, start_timestamp, transaction_hash}}`;
  }

  getRecordFromSubql(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: NONCE_ASC, filter: {id: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, amount, start_timestamp, transaction_hash, sender, receiver, fee}}}`;
  }
}
