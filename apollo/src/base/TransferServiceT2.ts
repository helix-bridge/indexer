import { ConfigService } from '@nestjs/config';

/*
This model is suitable for multi-chain interconnection scenarios,
where each chain connects all other chains at the same time.
And we configure a collection of chains, where all chains in the collection may be connected to each other with bridges of the same model
*/

export interface PartnerT2 {
  chainId: number;
  chain: string;
  url: string; // record api endpoint
}

export abstract class BaseTransferServiceT2 {
  abstract formalChainTransfers: PartnerT2[];
  abstract testChainTransfers: PartnerT2[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): PartnerT2[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}
