import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferService, Transfer } from '../base/TransferService';

@Injectable()
export class TransferService extends BaseTransferService {
  private readonly issuingUrl = this.configService.get<string>('SUBSTRATE_TO_PARACHAIN_ISSUING');
  private readonly backingUrl = this.configService.get<string>('SUBSTRATE_TO_PARACHAIN_BACKING');

  private readonly chain = this.configService.get<string>('PARACHAIN');

  formalChainTransfers: Transfer[] = [
    {
      backing: { chain: 'crab', url: this.backingUrl, token: 'CRAB', feeToken: 'CRAB' },
      issuing: { chain: 'crab-parachain', url: this.issuingUrl, token: 'CRAB', feeToken: 'CRAB' },
    },
  ];

  testChainTransfers: Transfer[] = [
    {
      backing: { chain: 'pangolin', url: this.backingUrl, token: 'PRING', feeToken: 'PRING' },
      issuing: {
        chain: 'pangolin-parachain',
        url: this.issuingUrl,
        token: 'PRING',
        feeToken: 'PRING',
      },
    },
  ];

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
