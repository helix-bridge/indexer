import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransferService {
  private readonly goerliEthEndpoint = this.configService.get<string>('GOERLI_ENDPOINT');
  private readonly arbitrumGoerliEndpoint = this.configService.get<string>('ARBITRUM_ENDPOINT');
  private readonly ethEndpoint = this.configService.get<string>('L2_ETHEREUM_URL');
  private readonly arbitrumEndpoint = this.configService.get<string>('L2_ARBITRUM_URL');

  public formalChainTransfers = {
    l1Chain: {
      name: 'ethereum',
      url: this.ethEndpoint,
      tokens: {
        '0x9469d013805bffb7d3debe5e7839237e535ec483': {
          token: 'RING',
          decimals: 1e18,
          origin: 'RING',
          parter: '0x9e523234d36973f9e38642886197d023c88e307e',
        },
      },
    },
    l2Chain: {
      name: 'arbitrum',
      url: this.arbitrumEndpoint,
      tokens: {
        '0x9e523234d36973f9e38642886197d023c88e307e': {
          token: 'RING',
          decimals: 1e18,
          origin: 'RING',
          parter: '0x9469d013805bffb7d3debe5e7839237e535ec483',
        },
      },
    },
  };

  public testChainTransfers = {
    l1Chain: {
      name: 'goerli',
      url: this.goerliEthEndpoint,
      tokens: {
        '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e': {
          token: 'RING',
          decimals: 1e18,
          origin: 'RING',
          parter: '0xfbad806bdf9cec2943be281fb355da05068de925',
        },
      },
    },
    l2Chain: {
      name: 'arbitrum-goerli',
      url: this.arbitrumGoerliEndpoint,
      tokens: {
        '0xfbad806bdf9cec2943be281fb355da05068de925': {
          token: 'RING',
          decimals: 1e18,
          origin: 'RING',
          parter: '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e',
        },
      },
    },
  };

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  get chainTokenInfo() {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }

  constructor(public configService: ConfigService) {}
}
