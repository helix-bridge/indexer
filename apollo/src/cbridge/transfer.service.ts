import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly hecoEndpoint = this.configService.get<string>('HECO_ENDPOINT');
  private readonly crabSmartEndpoint = this.configService.get<string>('CRAB_SMART_CHAIN_ENDPOINT');
  private readonly polygonEndpoint = this.configService.get<string>('POLYGON_ENDPOINT');
  private readonly ethereumEndpoint = this.configService.get<string>('ETHEREUM_ENDPOINT');
  private readonly arbitrumEndpoint = this.configService.get<string>('ARBITRUM_ENDPOINT');
  private readonly astarEndpoint = this.configService.get<string>('ASTAR_ENDPOINT');
  private readonly avalancheEndpoint = this.configService.get<string>('AVALANCHE_ENDPOINT');
  private readonly bscEndpoint = this.configService.get<string>('BSC_ENDPOINT');
  private readonly optimismEndpoint = this.configService.get<string>('OPTIMISM_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [
    {
      chainId: 128,
      chain: 'heco',
      url: this.hecoEndpoint,
    },
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.crabSmartEndpoint,
    },
    {
      chainId: 137,
      chain: 'polygon',
      url: this.polygonEndpoint,
    },
    {
      chainId: 1,
      chain: 'ethereum',
      url: this.ethereumEndpoint,
    },
    {
      chainId: 42161,
      chain: 'arbitrum',
      url: this.arbitrumEndpoint,
    },
    {
      chainId: 592,
      chain: 'astar',
      url: this.astarEndpoint,
    },
    {
      chainId: 43114,
      chain: 'avalanche',
      url: this.avalancheEndpoint,
    },
    {
      chainId: 56,
      chain: 'bsc',
      url: this.bscEndpoint,
    },
    {
      chainId: 10,
      chain: 'optimism',
      url: this.optimismEndpoint,
    },
  ];

  testChainTransfers: PartnerT2[] = [];

  readonly addressToTokenInfo = {
    heco: {
      // ring on heco
      '0x15e65456310ecb216b51efbd8a1dbf753353dcf9': {
        token: 'RING',
        decimals: 1e18,
      },
    },
    ethereum: {
      '0x9469d013805bffb7d3debe5e7839237e535ec483': {
        token: 'RING',
        decimals: 1e18,
      },
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        token: 'USDC',
        decimals: 1e6,
      },
      '0xdac17f958d2ee523a2206206994597c13d831ec7': {
        token: 'USDT',
        decimals: 1e6,
      },
      '0x4fabb145d64652a948d72533023f6e7a623c7c53': {
        token: 'BUSD',
        decimals: 1e18,
      },
    },
    bsc: {
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {
        token: 'USDC',
        decimals: 1e18,
      },
      '0x55d398326f99059ff775485246999027b3197955': {
        token: 'USDT',
        decimals: 1e18,
      },
      '0xe9e7cea3dedca5984780bafc599bd69add087d56': {
        token: 'BUSD',
        decimals: 1e18,
      },
    },
    arbitrum: {
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': {
        token: 'USDC',
        decimals: 1e6,
      },
      '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': {
        token: 'USDT',
        decimals: 1e6,
      },
    },
    polygon: {
      '0x9c1c23e60b72bc88a043bf64afdb16a02540ae8f': {
        token: 'RING',
        decimals: 1e18,
      },
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': {
        token: 'USDC',
        decimals: 1e6,
      },
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': {
        token: 'USDT',
        decimals: 1e6,
      },
    },
    avalanche: {
      '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664': {
        token: 'USDC',
        decimals: 1e6,
      },
      '0xc7198437980c041c805A1EDcbA50c1Ce5db95118': {
        token: 'USDT',
        decimals: 1e6,
      },
    },
    optimism: {
      '0x7F5c764cBc14f9669B88837ca1490cCa17c31607': {
        token: 'USDC',
        decimals: 1e6,
      },
      '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': {
        token: 'USDT',
        decimals: 1e6,
      },
    },
    astar: {
      '0x6a2d262d56735dba19dd70682b39f6be9a931d98': {
        token: 'USDC',
        decimals: 1e18,
      },
      '0x3795c36e7d12a8c252a20c5a7b455f7c57b60283': {
        token: 'USDT',
        decimals: 1e18,
      },
      '0x4bf769b05e832fcdc9053fffbc78ca889acb5e1e': {
        token: 'BUSD',
        decimals: 1e18,
      },
    },
    'crab-dvm': {
      '0x7399ea6c9d35124d893b8d9808930e9d3f211501': {
        token: 'xRING',
        decimals: 1e9,
      },
      '0x81ecac0d6be0550a00ff064a4f9dd2400585fe9c': {
        token: 'USDC',
        decimals: 1e18,
      },
      '0x6a2d262d56735dba19dd70682b39f6be9a931d98': {
        token: 'USDT',
        decimals: 1e18,
      },
    },
  };

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
