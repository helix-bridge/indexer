import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, PartnerT3 } from '../base/TransferServiceT3';

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
  private readonly lnDarwiniaOppositeEndpoint = this.configService.get<string>(
    'LN_DARWINIA_OPPOSITE_ENDPOINT'
  );
  private readonly lnCrabDefaultEndpoint = this.configService.get<string>(
    'LN_CRAB_DEFAULT_ENDPOINT'
  );
  private readonly lnBscDefaultEndpoint = this.configService.get<string>('LN_BSC_DEFAULT_ENDPOINT');
  private readonly lnOpDefaultEndpoint = this.configService.get<string>('LN_OP_DEFAULT_ENDPOINT');

  formalChainTransfers: PartnerT3[] = [
    {
      chainId: 1,
      chainName: 'ethereum',
      defaultEndpoint: this.lnEthereumDefaultEndpoint,
      oppositeEndpoint: this.lnEthereumOppositeEndpoint,
      tokens: [
        {
          key: 'RING',
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
      ],
    },
    {
      chainId: 42161,
      chainName: 'arbitrum',
      defaultEndpoint: this.lnArbitrumDefaultEndpoint,
      oppositeEndpoint: this.lnArbitrumOppositeEndpoint,
      tokens: [
        {
          key: 'RING',
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
          key: 'USDT',
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
            {
              toChain: 56,
              toSymbol: 'USDT',
              toAddress: '0x55d398326f99059fF775485246999027B3197955',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59144,
              toSymbol: 'USDT',
              toAddress: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 5000,
              toSymbol: 'USDC',
              toAddress: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 534352,
              toSymbol: 'USDC',
              toAddress: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
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
          key: 'USDT',
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
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 42161,
              toSymbol: 'USDC',
              toAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 534352,
              toSymbol: 'USDC',
              toAddress: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
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
          key: 'RING',
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
          key: 'USDT',
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
          key: 'USDT',
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
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 5000,
              toSymbol: 'USDC',
              toAddress: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 42161,
              toSymbol: 'USDC',
              toAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
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
      oppositeEndpoint: this.lnDarwiniaOppositeEndpoint,
      tokens: [
        {
          key: 'RING',
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
              toChain: 1,
              toSymbol: 'RING',
              toAddress: '0x9469D013805bFfB7D3DEBe5E7839237e535ec483',
              protocolFee: 100000000000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'msgline',
            },
            {
              toChain: 44,
              toSymbol: 'xWRING',
              toAddress: '0x273131F7CB50ac002BDd08cA721988731F7e1092',
              protocolFee: 10000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'msgline',
            },
          ],
        },
        {
          key: 'CRAB',
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
              channel: 'msgline',
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
          key: 'CRAB',
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
              channel: 'msgline',
            },
          ],
        },
        {
          key: 'RING',
          fromSymbol: 'xWRING',
          fromAddress: '0x273131F7CB50ac002BDd08cA721988731F7e1092',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 46,
              toSymbol: 'RING',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 10000000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'msgline',
            },
          ],
        },
      ],
    },
    {
      chainId: 56,
      chainName: 'bsc',
      defaultEndpoint: this.lnBscDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          key: 'USDT',
          fromSymbol: 'USDT',
          fromAddress: '0x55d398326f99059fF775485246999027B3197955',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 42161,
              toSymbol: 'USDT',
              toAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
              protocolFee: 100000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 10,
              toSymbol: 'USDT',
              toAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
              protocolFee: 100000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 59144,
              toSymbol: 'USDT',
              toAddress: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
              protocolFee: 100000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 8453,
              toSymbol: 'USDC',
              toAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
              protocolFee: 100000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 8453,
      chainName: 'base',
      defaultEndpoint: this.lnBaseDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 56,
              toSymbol: 'USDC',
              toAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 10,
      chainName: 'op',
      defaultEndpoint: this.lnOpDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          key: 'USDT',
          fromSymbol: 'USDT',
          fromAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 56,
              toSymbol: 'USDT',
              toAddress: '0x55d398326f99059fF775485246999027B3197955',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 59144,
      chainName: 'linea',
      defaultEndpoint: this.lnLineaDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          key: 'USDT',
          fromSymbol: 'USDT',
          fromAddress: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 56,
              toSymbol: 'USDT',
              toAddress: '0x55d398326f99059fF775485246999027B3197955',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 42161,
              toSymbol: 'USDT',
              toAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
              protocolFee: 100000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
  ];

  testChainTransfers: PartnerT3[] = [
    {
      chainId: 11155111,
      chainName: 'sepolia',
      defaultEndpoint: this.lnEthereumDefaultEndpoint,
      oppositeEndpoint: this.lnEthereumOppositeEndpoint,
      tokens: [
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0x0ac58Df0cc3542beC4cDa71B16D06C3cCc39f405',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 421614,
              toSymbol: 'USDC',
              toAddress: '0x8A87497488073307E1a17e8A12475a94Afcb413f',
              protocolFee: 100000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 300,
              toSymbol: 'USDC',
              toAddress: '0x253adBFE99Fcd096B9b5502753F96CF78D42eaD0',
              protocolFee: 100000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'USDT',
          fromSymbol: 'USDT',
          fromAddress: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 421614,
              toSymbol: 'USDT',
              toAddress: '0x3b8Bb7348D4F581e67E2498574F73e4B9Fc51855',
              protocolFee: 100000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 300,
              toSymbol: 'USDT',
              toAddress: '0x3350f1ef046e21E052dCbA60Fc575919CCaFEdeb',
              protocolFee: 100000000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'ETH',
          fromSymbol: 'ETH',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 421614,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'layerzero',
            },
            {
              toChain: 300,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 421614,
      chainName: 'arbitrum-sepolia',
      defaultEndpoint: this.lnArbitrumDefaultEndpoint,
      oppositeEndpoint: this.lnArbitrumOppositeEndpoint,
      tokens: [
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0x8A87497488073307E1a17e8A12475a94Afcb413f',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 11155111,
              toSymbol: 'USDC',
              toAddress: '0x0ac58Df0cc3542beC4cDa71B16D06C3cCc39f405',
              protocolFee: 100000000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'layerzero',
            },
            {
              toChain: 300,
              toSymbol: 'USDC',
              toAddress: '0x253adBFE99Fcd096B9b5502753F96CF78D42eaD0',
              protocolFee: 100000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'USDT',
          fromSymbol: 'USDT',
          fromAddress: '0x3b8Bb7348D4F581e67E2498574F73e4B9Fc51855',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 11155111,
              toSymbol: 'USDT',
              toAddress: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
              protocolFee: 100000000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'layerzero',
            },
            {
              toChain: 300,
              toSymbol: 'USDT',
              toAddress: '0x3350f1ef046e21E052dCbA60Fc575919CCaFEdeb',
              protocolFee: 100000000000000000,
              decimals: 6,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'ETH',
          fromSymbol: 'ETH',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 11155111,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000,
              decimals: 18,
              bridgeType: 'opposite',
              channel: 'layerzero',
            },
            {
              toChain: 300,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
      ],
    },
    {
      chainId: 300,
      chainName: 'zksync-sepolia',
      defaultEndpoint: this.lnZkSyncDefaultEndpoint,
      oppositeEndpoint: null,
      tokens: [
        {
          key: 'USDC',
          fromSymbol: 'USDC',
          fromAddress: '0x253adBFE99Fcd096B9b5502753F96CF78D42eaD0',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 11155111,
              toSymbol: 'USDC',
              toAddress: '0x0ac58Df0cc3542beC4cDa71B16D06C3cCc39f405',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421614,
              toSymbol: 'USDC',
              toAddress: '0x8A87497488073307E1a17e8A12475a94Afcb413f',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'USDT',
          fromSymbol: 'USDT',
          fromAddress: '0x3350f1ef046e21E052dCbA60Fc575919CCaFEdeb',
          decimals: 6,
          remoteInfos: [
            {
              toChain: 11155111,
              toSymbol: 'USDT',
              toAddress: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421614,
              toSymbol: 'USDT',
              toAddress: '0x3b8Bb7348D4F581e67E2498574F73e4B9Fc51855',
              protocolFee: 100000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
          ],
        },
        {
          key: 'ETH',
          fromSymbol: 'ETH',
          fromAddress: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          remoteInfos: [
            {
              toChain: 11155111,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000,
              decimals: 18,
              bridgeType: 'default',
              channel: 'layerzero',
            },
            {
              toChain: 421614,
              toSymbol: 'ETH',
              toAddress: '0x0000000000000000000000000000000000000000',
              protocolFee: 100000000000000,
              decimals: 18,
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
