import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly darwainiaUrl = this.configService.get<string>('XTOKEN_DARWINIA');
  private readonly ethereumUrl = this.configService.get<string>('XTOKEN_ETHEREUM');
  private readonly darwiniaDispatchSubgraph = this.configService.get<string>('XTOKEN_DISPATCH_DARWINIA');
  private readonly ethereumDispatchSubgraph = this.configService.get<string>('XTOKEN_DISPATCH_ETHEREUM');

  formalChainTransfers: PartnerT2[] = [];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 43,
      chain: 'pangolin-dvm',
      url: this.darwainiaUrl,
      bridge: 'xtokenbridge',
      symbols: [
        {
          key: 'PRING',
          symbol: 'PRING',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 0,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'sepolia',
          channel: 'msgport'
        }
      ]
    },
    {
      chainId: 11155111,
      chain: 'sepolia',
      url: this.ethereumUrl,
      bridge: 'xtokenbridge',
      symbols: [
        {
          key: 'PRING',
          symbol: 'xPRING',
          address: '0xBC43cb6175FcC8E577a0846256eA699b87eFcEE5',
          protocolFee: 0,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'pangolin-dvm',
          channel: 'msgport'
        }
      ]
    },
  ];

  dispatchEndPoints = {
    'pangolin-dvm': this.darwiniaDispatchSubgraph,
    sepolia: this.ethereumDispatchSubgraph,
    darwinia: this.darwiniaDispatchSubgraph,
    ethereum: this.ethereumDispatchSubgraph,
  };
  addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
