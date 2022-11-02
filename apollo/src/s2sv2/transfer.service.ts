import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';
import { AddressTokenMap } from '../base/AddressToken';

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
        url: this.backingSubgraphUrl + '/darwinia',
        feeToken: 'RING',
      },
      target: {
        chain: 'crab-dvm',
        url: this.issuingSubgraphUrl + '/crab',
        feeToken: 'CRAB',
      },
    },
    {
      source: {
        chain: 'crab-dvm',
        url: this.issuingSubgraphUrl + '/crab',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'darwinia-dvm',
        url: this.backingSubgraphUrl + '/darwinia',
        feeToken: 'RING',
      },
    },
  ];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {
    'crab-dvm': {
      '0x273131f7cb50ac002bdd08ca721988731f7e1092': {
        token: 'xWRING',
        decimals: 1e18,
        origin: 'RING',
      },
    },
    'darwinia-dvm': {
      '0xe7578598aac020abfb918f33a20fad5b71d670b4': {
        token: 'WRING',
        decimals: 1e18,
        origin: 'RING',
      },
    },
  };

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
