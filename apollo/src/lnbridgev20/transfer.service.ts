import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly lnEthereumDefaultEndpoint = this.configService.get<string>(
    'LN_ETHEREUM_DEFAULT_ENDPOINT'
  );
  private readonly lnEthereumOppositeEndpoint = this.configService.get<string>(
    'LN_ETHEREUM_OPPOSITE_ENDPOINT'
  );
  private readonly lnLineaDefaultEndpoint = this.configService.get<string>(
    'LN_LINEA_DEFAULT_ENDPOINT'
  );
  private readonly lnLineaOppositeEndpoint = this.configService.get<string>(
    'LN_LINEA_OPPOSITE_ENDPOINT'
  );
  private readonly lnMantleDefaultEndpoint = this.configService.get<string>(
    'LN_MANTLE_DEFAULT_ENDPOINT'
  );
  private readonly lnMantleOppositeEndpoint = this.configService.get<string>(
    'LN_MANTLE_OPPOSITE_ENDPOINT'
  );
  private readonly lnArbitrumDefaultEndpoint = this.configService.get<string>(
    'LN_ARBITRUM_DEFAULT_ENDPOINT'
  );
  private readonly lnArbitrumOppositeEndpoint = this.configService.get<string>(
    'LN_ARBITRUM_OPPOSITE_ENDPOINT'
  );
  private readonly lnZkSyncDefaultEndpoint = this.configService.get<string>(
    'LN_ZKSYNC_DEFAULT_ENDPOINT'
  );
  private readonly lnPolygonDefaultEndpoint = this.configService.get<string>(
    'LN_POLYGON_DEFAULT_ENDPOINT'
  );
  private readonly lnScrollDefaultEndpoint = this.configService.get<string>(
    'LN_SCROLL_DEFAULT_ENDPOINT'
  );
  private readonly lnBaseDefaultEndpoint = this.configService.get<string>(
    'LN_BASE_DEFAULT_ENDPOINT'
  );
  private readonly lnDarwiniaDefaultEndpoint = this.configService.get<string>(
    'LN_DARWINIA_DEFAULT_ENDPOINT'
  );

  formalChainTransfers: PartnerT2[] = [
    {
      chainId: 1,
      chain: 'ethereum',
      url: this.lnEthereumOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'RING',
          address: '0x9469D013805bFfB7D3DEBe5E7839237e535ec483',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 42161,
      chain: 'arbitrum',
      url: this.lnArbitrumOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'RING',
          address: '0x9e523234D36973f9e38642886197D023C88e307e',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 1,
      chain: 'ethereum',
      url: this.lnEthereumDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'RING',
          address: '0x9469D013805bFfB7D3DEBe5E7839237e535ec483',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 42161,
      chain: 'arbitrum',
      url: this.lnArbitrumDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'RING',
          address: '0x9e523234D36973f9e38642886197D023C88e307e',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
    },
    {
      chainId: 5000,
      chain: 'mantle',
      url: this.lnMantleDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDT',
          address: '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
    },
    {
      chainId: 137,
      chain: 'polygon',
      url: this.lnPolygonDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'RING',
          address: '0x9c1c23e60b72bc88a043bf64afdb16a02540ae8f',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 324,
      chain: 'zksync',
      url: this.lnZkSyncDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDT',
          address: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
    },
    {
      chainId: 534352,
      chain: 'scroll',
      url: this.lnScrollDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDT',
          address: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
    },
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.lnDarwiniaDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'RING',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
      ],
    },
  ];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 5,
      chain: 'goerli',
      url: this.lnEthereumDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          symbol: 'USDT',
          address: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
        {
          symbol: 'MNT',
          address: '0xc1dc2d65a2243c22344e725677a3e3bebd26e604',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 5,
      chain: 'goerli',
      url: this.lnEthereumOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          symbol: 'USDT',
          address: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
        {
          symbol: 'MNT',
          address: '0xc1dc2d65a2243c22344e725677a3e3bebd26e604',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 421613,
      chain: 'arbitrum-goerli',
      url: this.lnArbitrumDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x543bf1AC41485dc78039b9351563E4Dd13A288cb',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 421613,
      chain: 'arbitrum-goerli',
      url: this.lnArbitrumOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x543bf1AC41485dc78039b9351563E4Dd13A288cb',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 5001,
      chain: 'mantle-goerli',
      url: this.lnMantleDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xD610DE267f7590D5bCCE89489ECd2C1A4AfdF76B',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0xDb06D904AC5Bdff3b8E6Ac96AFedd3381d94CFDD',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'MNT',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 5001,
      chain: 'mantle-goerli',
      url: this.lnMantleOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xD610DE267f7590D5bCCE89489ECd2C1A4AfdF76B',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0xDb06D904AC5Bdff3b8E6Ac96AFedd3381d94CFDD',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'MNT',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 59140,
      chain: 'linea-goerli',
      url: this.lnLineaDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x8f3663930211f3DE17619FEB2eeB44c9c3F44a06',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 59140,
      chain: 'linea-goerli',
      url: this.lnLineaOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x8f3663930211f3DE17619FEB2eeB44c9c3F44a06',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 280,
      chain: 'zksync-goerli',
      url: this.lnZkSyncDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDC',
          address: '0xAe60e005C560E869a2bad271e38e3C9D78381aFF',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0xb5372ed3bb2CbA63e7908066ac10ee94d30eA839',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 84531,
      chain: 'base-goerli',
      url: this.lnBaseDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDT',
          address: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
          protocolFee: 10000000000000000000,
          decimals: 18,
        },
      ],
    },
  ];

  addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  // message channel is used to withdraw liquidity
  public readonly messageChannel = {
    goerli: {
      'arbitrum-goerli': 'arbitrum-l2',
      'linea-goerli': 'linea-l2',
      'mantle-goerli': 'axelar',
      'zksync-goerli': 'layerzero',
      'base-goerli': 'layerzero',
    },
    'base-goerli': {
       goerli: 'layerzero',
    },
    'arbitrum-goerli': {
      goerli: 'arbitrum-l2',
      'linea-goerli': 'layerzero',
      'mantle-goerli': 'layerzero',
      'zksync-goerli': 'layerzero',
    },
    'linea-goerli': {
      goerli: 'linea-l2',
      'arbitrum-goerli': 'layerzero',
      'mantle-goerli': 'layerzero',
      'zksync-goerli': 'layerzero',
    },
    'mantle-goerli': {
      goerli: 'axelar',
      'arbitrum-goerli': 'layerzero',
      'linea-goerli': 'layerzero',
      'zksync-goerli': 'layerzero',
    },
    'zksync-goerli': {
      goerli: 'layerzero',
      'arbitrum-goerli': 'layerzero',
      'linea-goerli': 'layerzero',
      'mantle-goerli': 'layerzero',
    },
    'arbitrum': {
      ethereum: 'arbitrum-l2',
      mantle: 'layerzero',
      zksync: 'layerzero',
      polygon: 'layerzero',
      'darwinia-dvm': 'msgline',
    },
    'ethereum': {
      arbitrum: 'arbitrum-l2',
    },
    'mantle': {
      arbitrum: 'layerzero',
      zksync: 'layerzero',
      scroll: 'layerzero',
    },
    'zksync': {
      arbitrum: 'layerzero',
      mantle: 'layerzero',
      scroll: 'layerzero',
    },
    'polygon': {
      arbitrum: 'layerzero',
    },
    'scroll': {
      zksync: 'layerzero',
      mantle: 'layerzero',
    },
    'darwinia-dvm': {
      arbitrum: 'msgline',
    },
  };
  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
