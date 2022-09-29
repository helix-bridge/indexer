import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, TransferT3 } from '../base/TransferServiceT3';

@Injectable()
export class TransferService extends BaseTransferServiceT3 {
  private readonly backingSubgraphUrl = this.configService.get<string>('SUB2ETH_BACKING');
  private readonly issuingSubgraphUrl = this.configService.get<string>('SUB2ETH_ISSUING');
  private readonly inboundLaneSubgraph = this.configService.get<string>('SUB2ETH_INBOUND');

  formalChainTransfers: TransferT3[] = [
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
      symbols: [
        {
          from: 'WRING',
          to: 'RING',
          address: '0xE7578598Aac020abFB918f33A20faD5B71d670b4',
        },
        {
          from: 'KTON',
          to: 'KTON',
          address: '0x0000000000000000000000000000000000000402',
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
      symbols: [
        {
          from: 'RING',
          to: 'WRING',
          address: '0x9469D013805bFfB7D3DEBe5E7839237e535ec483',
        },
        {
          from: 'KTON',
          to: 'KTON',
          address: '0x9F284E1337A815fe77D2Ff4aE46544645B20c5ff',
        },
      ],
    },
  ];

  testChainTransfers: TransferT3[] = [
    {
      source: {
        chain: 'pangoro-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'ORING',
      },
      target: {
        chain: 'goerli',
        url: this.issuingSubgraphUrl,
        feeToken: 'GoerliETH',
      },
      symbols: [
        {
          from: 'WORING',
          to: 'ORING',
          address: '0x46f01081e800bf47e43e7baa6d98d45f6a0251e4',
        },
        {
          from: 'OKTON',
          to: 'OKTON',
          address: '0x0000000000000000000000000000000000000402',
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
        chain: 'pangoro-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'ORING',
      },
      symbols: [
        {
          from: 'ORING',
          to: 'WORING',
          address: '0x046d07d53926318d1f06c2c2a0f26a4de83e26c4',
        },
        {
          from: 'OKTON',
          to: 'OKTON',
          address: '0xdd3df59c868fcd40fded7af0cccc3e2c7bcb4f3c',
        },
      ],
    },
  ];

  dispatchEndPoints = {
    pangoro: this.inboundLaneSubgraph + '/pangoro',
    goerli: this.inboundLaneSubgraph + '/goerli',
    darwinia: this.inboundLaneSubgraph + '/darwinia',
    ethereum: this.inboundLaneSubgraph + '/ethereum',
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(first: number, latestNonce: bigint | number, addressIn: string) {
    return `query { transferRecords (first: ${first}, orderBy: start_timestamp, orderDirection: asc, skip: ${latestNonce}, where: {token_in: [${addressIn}]}) {id, sender, receiver, token, amount, fee, start_timestamp, transaction_hash, is_native}}`;
  }
}
