import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly crabSub2SubLpEndpoint = this.configService.get<string>('CRAB_S2S_LP_ENDPOINT');
  private readonly darwiniaSub2SubLpEndpoint = this.configService.get<string>('DARWINIA_S2S_LP_ENDPOINT');
  private readonly ethereumSub2EthEndpoint = this.configService.get<string>('ETHEREUM_S2E_LP_ENDPOINT');
  private readonly darwiniaSub2EthLpEndpoint = this.configService.get<string>('DARWINIA_S2E_LP_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [
    /*
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.crabSub2SubLpEndpoint,
      bridge: 'sub2sublp',
    },
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.darwiniaSub2SubLpEndpoint,
      bridge: 'sub2sublp',
    },
    */
    {
      chainId: 1,
      chain: 'ethereum',
      url: this.ethereumSub2EthEndpoint,
      bridge: 'sub2ethlp',
    },
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.darwiniaSub2EthLpEndpoint,
      bridge: 'sub2ethlp',
    },
  ];

  testChainTransfers: PartnerT2[] = [];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {
    'crab-dvm': {
      '0x2d2b97ea380b0185e9fdf8271d1afb5d2bf18329': {
        token: 'WCRAB',
        decimals: 1e18,
        origin: 'WCRAB',
      },
      '0x273131f7cb50ac002bdd08ca721988731f7e1092': {
        token: 'xWRING',
        decimals: 1e18,
        origin: 'WRING',
      },
    },
    'darwinia-dvm': {
      '0x656567eb75b765fc320783cc6edd86bd854b2305': {
        token: 'xWCRAB',
        decimals: 1e18,
        origin: 'WCRAB',
      },
      '0xe7578598aac020abfb918f33a20fad5b71d670b4': {
        token: 'WRING',
        decimals: 1e18,
        origin: 'WRING',
      },
    },
    'ethereum': {
      '0x9469d013805bffb7d3debe5e7839237e535ec483': {
        token: 'RING',
        decimals: 1e18,
        origin: 'WRING',
      },
    },
  };

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
