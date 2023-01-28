import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly crabSmartEndpoint = this.configService.get<string>('CRAB_LP_ENDPOINT');
  private readonly darwiniaSmartEndpoint = this.configService.get<string>('DARWINIA_LP_ENDPOINT');
  private readonly ethereumEndpoint = this.configService.get<string>('ETHEREUM_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.crabSmartEndpoint,
    },
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.darwiniaSmartEndpoint,
    },
    //{
    //chainId: 1,
    //chain: 'ethereum',
    //url: this.ethereumEndpoint,
    //},
  ];

  testChainTransfers: PartnerT2[] = [];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {
    'crab-dvm': {
      '0x2d2b97ea380b0185e9fdf8271d1afb5d2bf18329': {
        token: 'WCRAB',
        decimals: 1e18,
        origin: 'WCRAB',
      },
    },
    'darwinia-dvm': {
      '0x656567eb75b765fc320783cc6edd86bd854b2305': {
        token: 'xWCRAB',
        decimals: 1e18,
        origin: 'WCRAB',
      },
    },
  };

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
