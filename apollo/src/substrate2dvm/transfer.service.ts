import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, TransferT3 } from '../base/TransferServiceT3';

@Injectable()
export class TransferService extends BaseTransferServiceT3 {
  private readonly endpoint = this.configService.get<string>('SUBSTRATE_DVM_ENDPOINT');

  formalChainTransfers: TransferT3[] = [
    {
      source: {
        chain: 'crab',
        url: this.endpoint + 'crab',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'crab-dvm',
        url: this.endpoint + 'crab',
        feeToken: 'CRAB',
      },
      isLock: true,
      symbols: [
        {
          from: 'CRAB',
          to: 'CRAB',
          address: 'balances',
        },
        {
          from: 'CKTON',
          to: 'CKTON',
          address: 'kton',
        },
      ],
    },
    {
      source: {
        chain: 'darwinia',
        url: this.endpoint + 'darwinia',
        feeToken: 'RING',
      },
      target: {
        chain: 'darwinia-dvm',
        url: this.endpoint + 'darwinia',
        feeToken: 'RING',
      },
      isLock: true,
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: 'balances',
        },
        {
          from: 'KTON',
          to: 'KTON',
          address: 'kton',
        },
      ],
    },
  ];

  testChainTransfers: TransferT3[] = [];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
