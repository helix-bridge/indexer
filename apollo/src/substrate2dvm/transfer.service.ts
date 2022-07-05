import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferService, Transfer } from '../base/TransferService';

@Injectable()
export class TransferService extends BaseTransferService {
  private readonly endpoint = this.configService.get<string>('SUBSTRATE_DVM_ENDPOINT');

  formalChainTransfers: Transfer[] = [
    {
      backing: { chain: 'crab', url: this.endpoint, token: 'CRAB', feeToken: 'CRAB' },
      issuing: { chain: 'crab-dvm', url: this.endpoint, token: 'CRAB', feeToken: 'CRAB' },
    },
  ];

  testChainTransfers: Transfer[] = [
    {
      backing: { chain: 'pangolin', url: this.endpoint, token: 'PRING', feeToken: 'PRING' },
      issuing: { chain: 'pangolin-dvm', url: this.endpoint, token: 'PRING', feeToken: 'PRING' },
    },
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
