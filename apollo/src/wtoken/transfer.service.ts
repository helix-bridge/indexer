import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

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
      isLock: true,
      symbols: [
        {
          from: 'RING',
          to: 'WRING',
          address: '',
        },
      ],
    },
    {
      source: {
        chain: 'crab-dvm',
        url: this.endpoint + '/crab',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'crab-dvm',
        url: this.endpoint + '/crab',
        feeToken: 'CRAB',
      },
      isLock: true,
      symbols: [
        {
          from: 'CRAB',
          to: 'WCRAB',
          address: '',
        },
      ],
    },
  ];

  testChainTransfers: TransferT1[] = [];

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) {id, account, amount, timestamp, direction}}`;
  }
}
