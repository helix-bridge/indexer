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

  testChainTransfers: PartnerT3[] = [
    {
      chainId: 5,
      chainName: 'goerli',
      defaultEndpoint: this.lnEthereumDefaultEndpoint,
      oppositeEndpoint: this.lnEthereumOppositeEndpoint,
      tokens: [
        {
          fromSymbol: 'USDC',
          fromAddress: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 421613,
              toSymbol: 'USDC',
              toAddress: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'arbitrum-l2',
            },
            {
              toChain: 5001,
              toSymbol: 'USDC',
              toAddress: '0xD610DE267f7590D5bCCE89489ECd2C1A4AfdF76B',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'axelar',
            },
            {
              toChain: 59140,
              toSymbol: 'USDC',
              toAddress: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'linea-l2',
            },
            {
              toChain: 280,
              toSymbol: 'USDC',
              toAddress: '0xAe60e005C560E869a2bad271e38e3C9D78381aFF',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'USDT',
          fromAddress: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 421613,
              toSymbol: 'USDT',
              toAddress: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'arbitrum-l2',
            },
            {
              toChain: 5001,
              toSymbol: 'USDT',
              toAddress: '0xDb06D904AC5Bdff3b8E6Ac96AFedd3381d94CFDD',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'axelar',
            },
            {
              toChain: 59140,
              toSymbol: 'USDT',
              toAddress: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'linea-l2',
            },
            {
              toChain: 280,
              toSymbol: 'USDT',
              toAddress: '0xAe60e005C560E869a2bad271e38e3C9D78381aFF',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 84531,
              toSymbol: 'USDT',
              toAddress: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'MNT',
          fromAddress: '0xc1dc2d65a2243c22344e725677a3e3bebd26e604',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5001,
              toSymbol: 'MNT',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'axelar',
            },
          ],
        },
        {
          fromSymbol: 'ETH',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 421613,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'arbitrum-l2',
            },
            {
              toChain: 59140,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'linea-l2',
            },
            {
              toChain: 280,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
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
      chainId: 421613,
      chainName: 'arbitrum-goerli',
      defaultEndpoint: this.lnArbitrumDefaultEndpoint,
      oppositeEndpoint: this.lnArbitrumOppositeEndpoint,
      tokens: [
        {
          fromSymbol: 'USDC',
          fromAddress: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDC',
              toAddress: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'opposite',
              channel: 'arbitrum-l2',
            },
            {
              toChain: 5001,
              toSymbol: 'USDC',
              toAddress: '0xD610DE267f7590D5bCCE89489ECd2C1A4AfdF76B',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'USDC',
              toAddress: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'USDT',
          fromAddress: '0x543bf1AC41485dc78039b9351563E4Dd13A288cb',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDT',
              toAddress: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'opposite',
              channel: 'arbitrum-l2',
            },
            {
              toChain: 5001,
              toSymbol: 'USDT',
              toAddress: '0xDb06D904AC5Bdff3b8E6Ac96AFedd3381d94CFDD',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'USDT',
              toAddress: '0x8f3663930211f3DE17619FEB2eeB44c9c3F44a06',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'ETH',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'arbitrum-l2',
            },
            {
              toChain: 280,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
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
      chainId: 5001,
      chainName: 'mantle-goerli',
      defaultEndpoint: this.lnMantleDefaultEndpoint,
      oppositeEndpoint: this.lnMantleOppositeEndpoint,
      tokens: [
        {
          fromSymbol: 'USDC',
          fromAddress: '0xD610DE267f7590D5bCCE89489ECd2C1A4AfdF76B',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDC',
              toAddress: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'axelar',
            },
            {
              toChain: 280,
              toSymbol: 'USDC',
              toAddress: '0xAe60e005C560E869a2bad271e38e3C9D78381aFF',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'USDC',
              toAddress: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'USDC',
              toAddress: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'USDT',
          fromAddress: '0xDb06D904AC5Bdff3b8E6Ac96AFedd3381d94CFDD',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDT',
              toAddress: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'axelar',
            },
            {
              toChain: 280,
              toSymbol: 'USDT',
              toAddress: '0xb5372ed3bb2CbA63e7908066ac10ee94d30eA839',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'USDT',
              toAddress: '0x543bf1AC41485dc78039b9351563E4Dd13A288cb',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'USDT',
              toAddress: '0x8f3663930211f3DE17619FEB2eeB44c9c3F44a06',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'MNT',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'MNT',
              toAddress: '0xc1dc2d65a2243c22344e725677a3e3bebd26e604',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'axelar',
            },
          ],
        },
      ],
    },
    {
      chainId: 59140,
      chainName: 'linea-goerli',
      defaultEndpoint: this.lnLineaDefaultEndpoint,
      oppositeEndpoint: this.lnLineaOppositeEndpoint,
      tokens: [
        {
          fromSymbol: 'USDC',
          fromAddress: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDC',
              toAddress: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'opposite',
              channel: 'linea-l2',
            },
            {
              toChain: 280,
              toSymbol: 'USDC',
              toAddress: '0xAe60e005C560E869a2bad271e38e3C9D78381aFF',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'USDC',
              toAddress: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 5001,
              toSymbol: 'USDC',
              toAddress: '0xD610DE267f7590D5bCCE89489ECd2C1A4AfdF76B',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'USDT',
          fromAddress: '0x8f3663930211f3DE17619FEB2eeB44c9c3F44a06',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDT',
              toAddress: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'opposite',
              channel: 'linea-l2',
            },
            {
              toChain: 280,
              toSymbol: 'USDT',
              toAddress: '0xb5372ed3bb2CbA63e7908066ac10ee94d30eA839',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'USDT',
              toAddress: '0x543bf1AC41485dc78039b9351563E4Dd13A288cb',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 5001,
              toSymbol: 'USDT',
              toAddress: '0xDb06D904AC5Bdff3b8E6Ac96AFedd3381d94CFDD',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'ETH',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'linea-l2',
            },
            {
              toChain: 280,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
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
      chainId: 280,
      chainName: 'zksync-goerli',
      defaultEndpoint: this.lnZkSyncDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'USDC',
          fromAddress: '0xAe60e005C560E869a2bad271e38e3C9D78381aFF',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDC',
              toAddress: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'USDC',
              toAddress: '0xeC89AF5FF618bbF667755BE9d63C69F21F1c00C8',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'USDC',
              toAddress: '0xBAD026e314a77e727dF643B02f63adA573a3757c',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 5001,
              toSymbol: 'USDC',
              toAddress: '0xD610DE267f7590D5bCCE89489ECd2C1A4AfdF76B',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'USDT',
          fromAddress: '0xb5372ed3bb2CbA63e7908066ac10ee94d30eA839',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDT',
              toAddress: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'USDT',
              toAddress: '0x8f3663930211f3DE17619FEB2eeB44c9c3F44a06',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'USDT',
              toAddress: '0x543bf1AC41485dc78039b9351563E4Dd13A288cb',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 5001,
              toSymbol: 'USDT',
              toAddress: '0xDb06D904AC5Bdff3b8E6Ac96AFedd3381d94CFDD',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          fromSymbol: 'ETH',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59140,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421613,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
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
      chainId: 84531,
      chainName: 'base-goerli',
      defaultEndpoint: this.lnBaseDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          fromSymbol: 'USDT',
          fromAddress: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 5,
              toSymbol: 'USDT',
              toAddress: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
              protocolFee: 100000000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
