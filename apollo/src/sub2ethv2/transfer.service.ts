import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly backingSubgraphUrl = this.configService.get<string>('SUB2ETH_BACKING');
  private readonly issuingSubgraphUrl = this.configService.get<string>('SUB2ETH_ISSUING');
  private readonly inboundLaneSubgraph = this.configService.get<string>('SUB2ETH_INBOUND');

  formalChainTransfers: TransferT1[] = [];

  testChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'pangoro-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'RING',
        token: 'wRING',
      },
      target: {
        chain: 'goerli',
        url: this.issuingSubgraphUrl,
        feeToken: 'ETH',
        token: 'RING',
      },
    },
    {
      source: {
        chain: 'goerli',
        url: this.issuingSubgraphUrl,
        feeToken: 'ETH',
        token: 'RING',
      },
      target: {
        chain: 'pangoro-dvm',
        url: this.backingSubgraphUrl,
        feeToken: 'RING',
        token: 'wRING',
      },
    },
  ];

  dispatchEndPoints = {
    pangoro: this.inboundLaneSubgraph + '/pangoro',
    goerli: this.inboundLaneSubgraph + 'goerli',
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: start_timestamp, orderDirection: asc, skip: ${latestNonce}) {id, sender, receiver, token, amount, fee, start_timestamp, transaction_hash}}`;
  }
}
