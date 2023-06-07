import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly goerliArb2EthLnv2Endpoint = this.configService.get<string>('GOERLI_A2E_LNV2_ENDPOINT');
  private readonly arbitrumGoerliArb2EthLnv2Endpoint = this.configService.get<string>('ARBITRUM_A2E_LNV2_ENDPOINT');

  formalChainTransfers: TransferT1[] = [];

  testChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'arbitrum-goerli',
        url: this.arbitrumGoerliArb2EthLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'goerli',
        url: this.goerliArb2EthLnv2Endpoint,
        feeToken: '',
      },
      isLock: true,
      bridge: 'arb2ethLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0xfbad806bdf9cec2943be281fb355da05068de925',
          toAddress: '0x1836BAFa3016Dd5Ce543D0F7199cB858ec69F41E',
        }
      ],
    },
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
