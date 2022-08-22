import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly crabParachainEndpoint = this.configService.get<string>('SUBSTRATE_TO_PARACHAIN_ISSUING');
  private readonly karuraEndpoint = this.configService.get<string>('KARURA_ENDPOINT');

  // this chainId is parachain id
  formalChainTransfers: PartnerT2[] = [
    {
      chainId: 2105,
      chain: 'crabparachain',
      url: this.crabParachainEndpoint,
    },
    {
      chainId: 2000,
      chain: 'karura',
      url: this.karuraEndpoint,
    },
  ];

  testChainTransfers: PartnerT2[] = [];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
