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

  formalChainTransfers: PartnerT2[] = [];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 5,
      chain: 'goerli',
      url: this.lnEthereumDefaultEndpoint,
      bridge: 'default',
      symbols: [
        {
          symbol: 'USDC',
          address: '0x1a70127284b774ff4a4dbfe0115114642f0eca65',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          symbol: 'USDT',
          address: '0x2303e4d55BF16a897Cb5Ab71c6225399509d9314',
          protocolFee: 100000000000000000000,
          decimals: 6,
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
      chainId: 5,
      chain: 'goerli',
      url: this.lnEthereumOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'USDC',
          address: '0x1a70127284B774fF4A4dbfe0115114642f0eca65',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          symbol: 'USDT',
          address: '0x2303e4d55BF16a897Cb5Ab71c6225399509d9314',
          protocolFee: 100000000000000000000,
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
          address: '0x39de82e1d9b8f62e11022fc3fc127a82f93fe47e',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x6d828718c1097a4c573bc25c638cc05bf10dfeaf',
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
      chainId: 421613,
      chain: 'arbitrum-goerli',
      url: this.lnArbitrumOppositeEndpoint,
      bridge: 'opposite',
      symbols: [
        {
          symbol: 'USDC',
          address: '0x39de82e1d9b8f62e11022fc3fc127a82f93fe47e',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x6d828718c1097a4c573bc25c638cc05bf10dfeaf',
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
          address: '0x0258eb547bfed540ed17843658c018569fe1e328',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x5f8d4232367759bce5d9488d3ade77fcff6b9b6b',
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
          address: '0x0258eb547bfed540ed17843658c018569fe1e328',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0x5f8d4232367759bce5d9488d3ade77fcff6b9b6b',
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
          address: '0xb5e028f980df5533cb0e8f04530b76637383d993',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0xbc1a2f123dc9cd2ec8d3ce42ef16c28f3c9ba686',
          protocolFee: 100000000,
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
          address: '0xb5e028f980df5533cb0e8f04530b76637383d993',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0xbc1a2f123dc9cd2ec8d3ce42ef16c28f3c9ba686',
          protocolFee: 100000000,
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
          address: '0xae60e005c560e869a2bad271e38e3c9d78381aff',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          symbol: 'USDT',
          address: '0xb5372ed3bb2cba63e7908066ac10ee94d30ea839',
          protocolFee: 100000000,
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
  ];

  addressToTokenInfo: { [key: string]: AddressTokenMap } = {};
  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
