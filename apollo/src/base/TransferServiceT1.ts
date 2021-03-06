import { ConfigService } from '@nestjs/config';

export interface PartnerT1 {
  chain: string;
  url: string; // record api endpoint
  feeToken: string;
}

export interface TransferT1 {
  source: PartnerT1;
  target: PartnerT1;
}

export abstract class BaseTransferServiceT1 {
  abstract formalChainTransfers: TransferT1[];
  abstract testChainTransfers: TransferT1[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): TransferT1[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}
