import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly backingSubgraphUrl = this.configService.get<string>('SUB2ETH_BACKING');
  private readonly issuingSubgraphUrl = this.configService.get<string>('SUB2ETH_ISSUING');
  private readonly inboundLaneSubgraph = this.configService.get<string>('SUB2ETH_INBOUND');

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
        },
        {
          from: 'KTON',
          to: 'KTON',
          address: '0x0000000000000000000000000000000000000402',
          toAddress: '0x9f284e1337a815fe77d2ff4ae46544645b20c5ff',
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
        },
        {
          from: 'KTON',
          to: 'KTON',
          address: '0x9f284e1337a815fe77d2ff4ae46544645b20c5ff',
          toAddress: '0x0000000000000000000000000000000000000402',
        },
      ],
    },
  ];

  testChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'pangolin-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'PRING',
      },
      target: {
        chain: 'goerli',
        url: this.issuingSubgraphUrl,
        feeToken: 'GoerliETH',
      },
      isLock: true,
      bridge: 'pangolin2goerli',
      symbols: [
        {
          from: 'WPRING',
          to: 'PRING',
          address: '0x3f3edbda6124462a09e071c5d90e072e0d5d4ed4',
          toAddress: '0xeb93165e3cdb354c977a182abf4fad3238e04319',
        },
        {
          from: 'OKTON',
          to: 'OKTON',
          address: '0x0000000000000000000000000000000000000402',
          toAddress: '0xdd3df59c868fcd40fded7af0cccc3e2c7bcb4f3c',
        },
      ],
    },
    {
      source: {
        chain: 'goerli',
        url: this.issuingSubgraphUrl,
        feeToken: 'GoerliETH',
      },
      target: {
        chain: 'pangolin-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'PRING',
      },
      isLock: false,
      bridge: 'goerli2pangolin',
      symbols: [
        {
          from: 'PRING',
          to: 'WPRING',
          address: '0xeb93165e3cdb354c977a182abf4fad3238e04319',
          toAddress: '0x3f3edbda6124462a09e071c5d90e072e0d5d4ed4',
        },
        {
          from: 'OKTON',
          to: 'OKTON',
          address: '0xdd3df59c868fcd40fded7af0cccc3e2c7bcb4f3c',
          toAddress: '0x0000000000000000000000000000000000000402',
        },
      ],
    },
  ];

  dispatchEndPoints = {
    pangolin: this.inboundLaneSubgraph + '/pangolin',
    goerli: this.inboundLaneSubgraph + '/goerli',
    darwinia: this.inboundLaneSubgraph + '/darwinia',
    ethereum: this.inboundLaneSubgraph + '/ethereum',
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
