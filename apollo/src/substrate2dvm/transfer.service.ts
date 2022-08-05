import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferService, Transfer } from '../base/TransferService';

@Injectable()
export class TransferService extends BaseTransferService {
  private readonly endpoint = this.configService.get<string>('SUBSTRATE_DVM_ENDPOINT');

  formalChainTransfers: Transfer[] = [
    {
      backing: { chain: 'crab', url: this.endpoint + 'crab', token: 'CRAB', feeToken: 'CRAB' },
      issuing: { chain: 'crab-dvm', url: this.endpoint + 'crab', token: 'CRAB', feeToken: 'CRAB' },
    },
    {
      backing: {
        chain: 'darwinia',
        url: this.endpoint + 'darwinia',
        token: 'RING',
        feeToken: 'RING',
      },
      issuing: {
        chain: 'darwinia-dvm',
        url: this.endpoint + 'darwinia',
        token: 'RING',
        feeToken: 'RING',
      },
    },
  ];

  testChainTransfers: Transfer[] = [
    {
      backing: {
        chain: 'pangolin',
        url: this.endpoint + 'pchain',
        token: 'PRING',
        feeToken: 'PRING',
      },
      issuing: {
        chain: 'pangolin-dvm',
        url: this.endpoint + 'pchain',
        token: 'PRING',
        feeToken: 'PRING',
      },
    },
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
