import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly subql = this.configService.get<string>('SUBQL');
  private readonly subqlX = this.configService.get<string>('SUBQL_X');
  private readonly subqlS = this.configService.get<string>('SUBQL_S');

  private readonly issuingSubgraphUrl = this.configService.get<string>('S2S_ISSUING');
  private readonly backingSubgraphUrl = this.configService.get<string>('S2S_BACKING');

  formalChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'darwinia-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'RING',
        token: 'WRING',
      },
      target: {
        chain: 'crab-dvm',
        url: this.issuingSubgraphUrl,
        feeToken: 'CRAB',
        token: 'xWRING',
      },
    },
    {
      source: {
        chain: 'crab-dvm',
        url: this.issuingSubgraphUrl,
        feeToken: 'CRAB',
        token: 'xWRING',
      },
      target: {
        chain: 'darwinia-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'RING',
        token: 'WRING',
      },
    },
  ];

  testChainTransfers: TransferT1[] = [];

  dispatchEndPoints = {
    pangolin: this.subqlX + 'pchain',
    pangoro: this.subqlS + 'pochain',
    crab: this.subql + 'crab',
    darwinia: this.subql + 'darwinia',
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: start_timestamp, orderDirection: asc, skip: ${latestNonce}) {id, sender, receiver, token, amount, fee, start_timestamp, transaction_hash}}`;
  }
}
