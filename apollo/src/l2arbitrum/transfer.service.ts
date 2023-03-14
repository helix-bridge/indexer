import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService {
  private readonly goerliEthEndpoint = this.configService.get<string>('GOERLI_ENDPOINT');
  private readonly arbitrumGoerliEndpoint = this.configService.get<string>('ARBITRUM_ENDPOINT');

  public formalChainTransfers = null;

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
