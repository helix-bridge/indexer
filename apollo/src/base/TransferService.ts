import { ConfigService } from '@nestjs/config';

export interface Partner {
  chain: string;
  url: string; // record api endpoint
  token: string;
  feeToken: string;
}

export interface Transfer {
  from: Partner;
  to: Partner;
}

export type TransferAction = 'lock' | 'burn';

export abstract class BaseTransferService {
  abstract formalChainTransfers: Transfer[];
  abstract testChainTransfers: Transfer[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): Transfer[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}
