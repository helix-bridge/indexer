import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly crabParachainEndpoint = this.configService.get<string>(
    'SUBSTRATE_TO_PARACHAIN_ISSUING'
  );
  private readonly karuraEndpoint = this.configService.get<string>('KARURA_ENDPOINT');
  private readonly moonriverEndpoint = this.configService.get<string>('MOONRIVER_ENDPOINT');
  private readonly khalaEndpoint = this.configService.get<string>('KHALA_ENDPOINT');
  private readonly shidenEndpoint = this.configService.get<string>('SHIDEN_ENDPOINT');

  // this chainId is parachain id
  formalChainTransfers: PartnerT2[] = [
    {
      chainId: 2105,
      chain: 'crab-parachain',
      url: this.crabParachainEndpoint,
    },
    {
      chainId: 2000,
      chain: 'karura',
      url: this.karuraEndpoint,
    },
    {
      chainId: 2023,
      chain: 'moonriver',
      url: this.moonriverEndpoint,
    },
  ];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 2105,
      chain: 'crab-parachain',
      url: this.crabParachainEndpoint,
    },
    {
      chainId: 2000,
      chain: 'karura',
      url: this.karuraEndpoint,
    },
    {
      chainId: 2023,
      chain: 'moonriver',
      url: this.moonriverEndpoint,
    },
    {
      chainId: 2004,
      chain: 'khala',
      url: this.khalaEndpoint,
    },
    {
      chainId: 2007,
      chain: 'shiden',
      url: this.shidenEndpoint,
    },
  ];
  addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
