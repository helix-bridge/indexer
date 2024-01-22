import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly backingSubgraphUrl = this.configService.get<string>('SUB2ETH_BACKING');
  private readonly issuingSubgraphUrl = this.configService.get<string>('SUB2ETH_ISSUING');
  private readonly inboundLaneDarwiniaSubgraph = this.configService.get<string>('SUB2ETH_INBOUND_DARWINIA');
  private readonly inboundLaneEthereumSubgraph = this.configService.get<string>('SUB2ETH_INBOUND_ETHEREUM');

  formalChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'darwinia-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'RING',
      },
      target: {
        chain: 'ethereum',
        url: this.issuingSubgraphUrl,
        feeToken: 'ETH',
      },
      isLock: true,
      bridge: 'darwinia2ethereum',
      symbols: [
        {
          from: 'WRING',
          to: 'RING',
          address: '0xe7578598aac020abfb918f33a20fad5b71d670b4',
          toAddress: '0x9469d013805bffb7d3debe5e7839237e535ec483',
          protocolFee: 0,
        },
        {
          from: 'KTON',
          to: 'KTON',
          address: '0x0000000000000000000000000000000000000402',
          toAddress: '0x9f284e1337a815fe77d2ff4ae46544645b20c5ff',
          protocolFee: 0,
        },
      ],
    },
    {
      source: {
        chain: 'ethereum',
        url: this.issuingSubgraphUrl,
        feeToken: 'ETH',
      },
      target: {
        chain: 'darwinia-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'RING',
      },
      isLock: false,
      bridge: 'ethereum2darwinia',
      symbols: [
        {
          from: 'RING',
          to: 'WRING',
          address: '0x9469d013805bffb7d3debe5e7839237e535ec483',
          toAddress: '0xe7578598aac020abfb918f33a20fad5b71d670b4',
          protocolFee: 0,
        },
        {
          from: 'KTON',
          to: 'KTON',
          address: '0x9f284e1337a815fe77d2ff4ae46544645b20c5ff',
          toAddress: '0x0000000000000000000000000000000000000402',
          protocolFee: 0,
        },
      ],
    },
  ];

  testChainTransfers: TransferT1[] = [];

  dispatchEndPoints = {
    darwinia: this.inboundLaneDarwiniaSubgraph,
    ethereum: this.inboundLaneEthereumSubgraph,
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
