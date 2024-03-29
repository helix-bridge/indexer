import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly crabSub2SubLnEndpoint = this.configService.get<string>('CRAB_S2S_LN_ENDPOINT');
  private readonly darwiniaSub2SubLnEndpoint = this.configService.get<string>(
    'DARWINIA_S2S_LN_ENDPOINT'
  );
  private readonly ethereumSub2EthLnEndpoint = this.configService.get<string>(
    'ETHEREUM_S2E_LN_ENDPOINT'
  );
  private readonly darwiniaSub2EthLnEndpoint = this.configService.get<string>(
    'DARWINIA_S2E_LN_ENDPOINT'
  );

  formalChainTransfers: PartnerT2[] = [
    /*
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.crabSub2SubLnEndpoint,
      bridge: 'sub2sublp',
    },
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.darwiniaSub2SubLnEndpoint,
      bridge: 'sub2sublp',
    },
    */
    {
      chainId: 1,
      chain: 'ethereum',
      url: this.ethereumSub2EthLnEndpoint,
      bridge: 'sub2ethlp',
      symbols: [],
      channels: [],
    },
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.darwiniaSub2EthLnEndpoint,
      bridge: 'sub2ethlp',
      symbols: [],
      channels: [],
    },
  ];

  testChainTransfers: PartnerT2[] = [];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {
    'arbitrum-goerli': {
      '0xfbad806bdf9cec2943be281fb355da05068de925': {
        token: 'RING',
        decimals: 1e18,
        origin: 'RING',
      },
    },
    goerli: {
      '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e': {
        token: 'RING',
        decimals: 1e18,
        origin: 'RING',
      },
    },
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
    ethereum: {
      '0x9469d013805bffb7d3debe5e7839237e535ec483': {
        token: 'RING',
        decimals: 1e18,
        origin: 'WRING',
      },
    },
    arbitrum: {
      '0x9e523234d36973f9e38642886197d023c88e307e': {
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
