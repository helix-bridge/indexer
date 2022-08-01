import { ConfigService } from '@nestjs/config';

export interface BridgeChain {
  chainId: number;
  chain: string;
  url: string; // record api endpoint
  token: string;
  feeToken: string;
  feeDecimals: number;
}

export abstract class BaseBridgeTransferService {
  abstract formalChainTransfers: BridgeChain[];
  abstract testChainTransfers: BridgeChain[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): BridgeChain[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}
