import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly ethereumEndpoint = this.configService.get<string>('ETHEREUM_LNV3_ENDPOINT');
  private readonly arbitrumEndpoint = this.configService.get<string>('ARBITRUM_LNV3_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 11155111,
      chain: 'sepolia',
      url: this.ethereumEndpoint,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x0ac58Df0cc3542beC4cDa71B16D06C3cCc39f405',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
          protocolFee: 100000000000000000000,
          decimals: 18,
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
          chain: 'arbitrum-sepolia',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 421614,
      chain: 'arbitrum-sepolia',
      url: this.arbitrumEndpoint,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x8A87497488073307E1a17e8A12475a94Afcb413f',
          protocolFee: 100000000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x3b8Bb7348D4F581e67E2498574F73e4B9Fc51855',
          protocolFee: 100000000000000000000,
          decimals: 18,
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
          chain: 'sepolia',
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
