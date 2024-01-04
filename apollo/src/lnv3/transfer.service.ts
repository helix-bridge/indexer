import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly ethereumEndpoint = this.configService.get<string>('ETHEREUM_LNV3_ENDPOINT');
  private readonly zkSyncEndpoint = this.configService.get<string>('ZKSYNC_LNV3_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 5,
      chain: 'goerli',
      url: this.ethereumEndpoint,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0xe9784E0d9A939dbe966b021DE3cd877284DB1B99',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0xa39cffE89567eBfb5c306a07dfb6e5B3ba41F358',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'zksync-goerli',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 280,
      chain: 'zksync-goerli',
      url: this.zkSyncEndpoint,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0xAe60e005C560E869a2bad271e38e3C9D78381aFF',
          protocolFee: 100000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0xb5372ed3bb2CbA63e7908066ac10ee94d30eA839',
          protocolFee: 100000000,
          decimals: 6,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'goerli',
          channel: 'layerzero',
        },
      ],
    },
  ];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
