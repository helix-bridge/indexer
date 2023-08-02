import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly ethereumArb2EthLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_A2E_LNV2_ENDPOINT'
  );
  private readonly arbitrumArb2EthLnv2Endpoint = this.configService.get<string>(
    'ARBITRUM_A2E_LNV2_ENDPOINT'
  );
  private readonly ethereumEth2ArbLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_E2A_LNV2_ENDPOINT'
  );
  private readonly arbitrumEth2ArbLnv2Endpoint = this.configService.get<string>(
    'ARBITRUM_E2A_LNV2_ENDPOINT'
  );

  formalChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'arbitrum',
        url: this.arbitrumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'ethereum',
        url: this.ethereumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      // this field `isLock` here used to indict the direction of the general message
      isLock: true,
      bridge: 'arb2ethLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0x9e523234d36973f9e38642886197d023c88e307e',
          toAddress: '0x9469d013805bffb7d3debe5e7839237e535ec483',
          protocolFee: 300000000000000000000,
        },
      ],
    },

  ];

  testChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'arbitrum-goerli',
        url: this.arbitrumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'goerli',
        url: this.ethereumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      isLock: true,
      bridge: 'arb2ethLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0xfbad806bdf9cec2943be281fb355da05068de925',
          toAddress: '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e',
          protocolFee: 1500000000000000000,
        },
      ],
    },
    {
      source: {
        chain: 'goerli',
        url: this.ethereumEth2ArbLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'arbitrum-goerli',
        url: this.arbitrumEth2ArbLnv2Endpoint,
        feeToken: '',
      },
      isLock: false,
      bridge: 'eth2arbLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e',
          toAddress: '0xfbad806bdf9cec2943be281fb355da05068de925',
          protocolFee: 1500000000000000000,
        },
      ],
    },
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
