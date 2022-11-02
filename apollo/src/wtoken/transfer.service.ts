import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly endpoint = this.configService.get<string>('WTOKEN_ENDPOINT');

  formalChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'darwinia-dvm',
        url: this.endpoint + '/darwinia',
        feeToken: 'RING',
      },
      target: {
        chain: 'darwinia-dvm',
        url: this.endpoint + '/darwinia',
        feeToken: 'RING',
      },
    },
  ];
  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {
    'darwinia-dvm': {
      '0': {
        token: 'WRING',
        decimals: 1e18,
        origin: 'RING',
      },
      '1': {
        token: 'RING',
        decimals: 1e18,
        origin: 'RING',
      },
    },
  };

  testChainTransfers: TransferT1[] = [];

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) {id, account, amount, timestamp, direction}}`;
  }
}
