import { ConfigService } from '@nestjs/config';

export interface PartnerT3 {
  chain: string;
  url: string;
  feeToken: string;
}

export interface PartnerSymbol {
  from: string;
  to: string;
  address: string;
}

export interface TransferT3 {
  source: PartnerT3;
  target: PartnerT3;
  isLock: boolean;
  symbols: PartnerSymbol[];
}

export abstract class BaseTransferServiceT3 {
  abstract formalChainTransfers: TransferT3[];
  abstract testChainTransfers: TransferT3[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): TransferT3[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}
