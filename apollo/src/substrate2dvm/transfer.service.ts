import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferService, Transfer } from '../base/TransferService';

@Injectable()
export class TransferService extends BaseTransferService {
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_DVM_ENDPOINT');
  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_DVM_ENDPOINT');

  formalChainTransfers: Transfer[] = [
    {
      from: { chain: 'crab', url: this.issuingUrl, token: 'CRAB', feeToken: 'CRAB' },
      to: { chain: 'crab-dvm', url: this.backingUrl, token: 'CRAB', feeToken: 'CRAB' },
    },
  ];

  testChainTransfers: Transfer[] = [
    {
      from: { chain: 'pangolin', url: this.issuingUrl, token: 'PRING', feeToken: 'PRING' },
      to: { chain: 'pangolin-dvm', url: this.backingUrl, token: 'PRING', feeToken: 'PRING' },
    },
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
