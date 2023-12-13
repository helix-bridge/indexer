import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT2, PartnerT2 } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly darwainiaUrl = this.configService.get<string>('XTOKEN_DARWINIA');
  private readonly ethereumUrl = this.configService.get<string>('XTOKEN_ETHEREUM');
  private readonly dispatchSubgraph = this.configService.get<string>('XTOKEN_DISPATCH');

  formalChainTransfers: PartnerT2[] = [];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.darwainiaUrl,
      bridge: 'xtokenbridge',
      symbols: [
        {
          symbol: 'CRAB',
          address: '0x0000000000000000000000000000000000000000',
          protocolFee: 0,
          decimals: 18,
        },
      ],
    },
    {
      chainId: 11155111,
      chain: 'sepolia',
      url: this.ethereumUrl,
      bridge: 'xtokenbridge',
      symbols: [
        {
          symbol: 'xCRAB',
          address: '0xe8835bB0735fbfD5ECAC1e20835D5B7C39622ba3',
          protocolFee: 0,
          decimals: 18,
        },
      ],
    },
  ];

  dispatchEndPoints = {
    'crab-dvm': this.dispatchSubgraph + '/crab',
    sepolia: this.dispatchSubgraph + '/sepolia',
    darwinia: this.dispatchSubgraph + '/darwinia',
    ethereum: this.dispatchSubgraph + '/ethereum',
  };
  addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
