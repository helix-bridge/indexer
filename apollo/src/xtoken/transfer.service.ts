import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly darwainiaUrl = this.configService.get<string>('XTOKEN_DARWINIA');
  private readonly crabUrl = this.configService.get<string>('XTOKEN_CRAB');
  private readonly ethereumUrl = this.configService.get<string>('XTOKEN_ETHEREUM');
  private readonly darwiniaDispatchSubgraph = this.configService.get<string>('XTOKEN_DISPATCH_DARWINIA');
  private readonly crabDispatchSubgraph = this.configService.get<string>('XTOKEN_DISPATCH_CRAB');
  private readonly ethereumDispatchSubgraph = this.configService.get<string>('XTOKEN_DISPATCH_ETHEREUM');

  formalChainTransfers: PartnerT2[] = [
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.darwainiaUrl,
      bridge: 'xtokenbridge',
      symbols: [
        {
          key: 'RING',
          symbol: 'RING',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 0,
          decimals: 18,
        },
        {
          key: 'CRAB',
          symbol: 'xWCRAB',
          address: '0x656567Eb75b765FC320783cc6EDd86bD854b2305',
          outerAddress: '0x656567Eb75b765FC320783cc6EDd86bD854b2305',
          protocolFee: 0,
          decimals: 18,
        }
      ],
      channels: [
        {
          chain: 'crab-dvm',
          channel: 'msgport'
        }
      ]
    },
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.crabUrl,
      bridge: 'xtokenbridge',
      symbols: [
        {
          key: 'RING',
          symbol: 'xWRING',
          address: '0x273131F7CB50ac002BDd08cA721988731F7e1092',
          outerAddress: '0x273131F7CB50ac002BDd08cA721988731F7e1092',
          protocolFee: 0,
          decimals: 18,
        },
        {
          key: 'CRAB',
          symbol: 'CRAB',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 0,
          decimals: 18,
        }
      ],
      channels: [
        {
          chain: 'darwinia-dvm',
          channel: 'msgport'
        }
      ]

    }
  ];

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
          address: '0x617E55f692FA2feFfdD5D9C513782A479cC1FF57',
          outerAddress: '0x0000000000000000000000000000000000000000',
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
          address: '0xF874fad204757588e67EE55cE93D654b6f5C39C6',
          outerAddress: '0xBD50868F36Eb46355eC5a153AbD3a7eA094A5c37',
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
    'darwinia-dvm': this.darwiniaDispatchSubgraph,
    ethereum: this.ethereumDispatchSubgraph,
    'crab-dvm': this.crabDispatchSubgraph,
  };
  addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
