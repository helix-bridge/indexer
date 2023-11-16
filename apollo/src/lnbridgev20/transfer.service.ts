import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, PartnerT3 } from '../base/TransferServiceT3';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT3 {
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
  private readonly lnCrabDefaultEndpoint = this.configService.get<string>(
    'LN_CRAB_DEFAULT_ENDPOINT'
  );

  formalChainTransfers: PartnerT3[] = [
    {
      chainId: 1,
      chainName: 'ethereum',
      defaultEndpoint: this.lnEthereumDefaultEndpoint,
      oppositeEndpoint: this.lnEthereumOppositeEndpoint,
      tokens: [
        {
          fromSymbol: 'RING',
          fromAddress: '0x9469D013805bFfB7D3DEBe5E7839237e535ec483',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 42161,
              toSymbol: 'RING',
              toAddress: '0x9e523234D36973f9e38642886197D023C88e307e',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'arbitrum-l2',
            },
          ],
        },
      ],
    },
    {
      chainId: 42161,
      chainName: 'arbitrum',
      defaultEndpoint: this.lnArbitrumDefaultEndpoint,
      oppositeEndpoint: this.lnArbitrumOppositeEndpoint,
      tokens: [
        {
          fromSymbol: 'RING',
          fromAddress: '0x9e523234D36973f9e38642886197D023C88e307e',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 1,
              toSymbol: 'RING',
              toAddress: '0x9469D013805bFfB7D3DEBe5E7839237e535ec483',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'arbitrum-l2',
            },
            {
              toChain: 137,
              toSymbol: 'RING',
              toAddress: '0x9c1c23e60b72bc88a043bf64afdb16a02540ae8f',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 46,
              toSymbol: 'RING',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'msgline',
            },
          ],
        },
        {
          fromSymbol: 'USDT',
          fromAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 5000,
              toSymbol: 'USDT',
              toAddress: '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 324,
              toSymbol: 'USDT',
              toAddress: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 5000,
      chainName: 'mantle',
      defaultEndpoint: this.lnMantleDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'USDT',
          fromAddress: '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 42161,
              toSymbol: 'USDT',
              toAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 324,
              toSymbol: 'USDT',
              toAddress: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 534352,
              toSymbol: 'USDT',
              toAddress: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 137,
      chainName: 'polygon',
      defaultEndpoint: this.lnPolygonDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'RING',
          fromAddress: '0x9c1c23e60b72bc88a043bf64afdb16a02540ae8f',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 42161,
              toSymbol: 'RING',
              toAddress: '0x9e523234D36973f9e38642886197D023C88e307e',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 324,
      chainName: 'zksync',
      defaultEndpoint: this.lnZkSyncDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'USDT',
          fromAddress: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 42161,
              toSymbol: 'USDT',
              toAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 5000,
              toSymbol: 'USDT',
              toAddress: '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 534352,
              toSymbol: 'USDT',
              toAddress: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 534352,
      chainName: 'scroll',
      defaultEndpoint: this.lnScrollDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'USDT',
          fromAddress: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 5000,
              toSymbol: 'USDT',
              toAddress: '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 324,
              toSymbol: 'USDT',
              toAddress: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 46,
      chainName: 'darwinia-dvm',
      defaultEndpoint: this.lnDarwiniaDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'RING',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 42161,
              toSymbol: 'RING',
              toAddress: '0x9e523234D36973f9e38642886197D023C88e307e',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'msgline',
            },
            {
              toChain: 44,
              toSymbol: 'xWRING',
              toAddress: '0x273131F7CB50ac002BDd08cA721988731F7e1092',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'sub2sub',
            },
          ],
        },
        {
          fromSymbol: 'xWCRAB',
          fromAddress: '0x656567Eb75b765FC320783cc6EDd86bD854b2305',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 44,
              toSymbol: 'CRAB',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'sub2sub',
            },
          ],
        },
      ],
    },
    {
      chainId: 44,
      chainName: 'crab-dvm',
      defaultEndpoint: this.lnCrabDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'CRAB',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 46,
              toSymbol: 'xWCRAB',
              toAddress: '0x656567Eb75b765FC320783cc6EDd86bD854b2305',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'sub2sub',
            },
          ],
        },
        {
          fromSymbol: 'xWRING',
          fromAddress: '0x273131F7CB50ac002BDd08cA721988731F7e1092',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 46,
              toSymbol: 'RING',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'sub2sub',
            },
          ],
        },
      ],
    },
  ];

  testChainTransfers: PartnerT3[] = [];

  /*
  testChainTransfers: PartnerT3[] = [
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
  */

  // message channel is used to withdraw liquidity
  /*
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
      'crab-dvm': 'sub2sub',
    },
    'crab-dvm': {
      'darwinia-dvm': 'sub2sub',
    }
  };
  */
  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
