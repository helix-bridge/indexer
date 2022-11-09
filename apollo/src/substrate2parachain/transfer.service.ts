import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, TransferT3 } from '../base/TransferServiceT3';

@Injectable()
export class TransferService extends BaseTransferServiceT3 {
  private readonly backingUrl = this.configService.get<string>('SUB_TO_PARA_BACKING');
  private readonly issuingUrl = this.configService.get<string>('SUB_TO_PARA_ISSUING');
  private readonly backingEndpointUrl = this.configService.get<string>('SUB_TO_PARA_END_BACKING');
  private readonly issuingEndpointUrl = this.configService.get<string>('SUB_TO_PARA_END_ISSUING');

  formalChainTransfers: TransferT3[] = [
    {
      source: {
        chain: 'crab-dvm',
        url: this.backingUrl + '/crab',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'crab-parachain',
        url: this.issuingUrl + '/crab-parachain',
        feeToken: 'CRAB',
      },
      isLock: true,
      symbols: [],
    },
    {
      source: {
        chain: 'crab-parachain',
        url: this.issuingUrl + '/crab-parachain',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'crab-dvm',
        url: this.backingUrl + 'crab',
        feeToken: 'CRAB',
      },
      isLock: false,
      symbols: [],
    },
  ];

  testChainTransfers: TransferT3[] = [
    {
      source: {
        chain: 'pangolin-dvm',
        url: this.backingUrl + '/pangolin',
        feeToken: 'PRING',
      },
      target: {
        chain: 'pangolin-parachain',
        url: this.issuingUrl,
        feeToken: 'PRING',
      },
      isLock: true,
      symbols: [],
    },
    {
      source: {
        chain: 'pangolin-parachain',
        url: this.issuingUrl,
        feeToken: 'PRING',
      },
      target: {
        chain: 'pangolin-dvm',
        url: this.backingUrl + '/pangolin',
        feeToken: 'PRING',
      },
      isLock: false,
      symbols: [],
    },
  ];

  dispatchEndPoints = {
    'crab-dvm': {
      url: this.backingEndpointUrl + '/crab',
      laneId: '',
    },
    'crab-parachain': {
      url: this.issuingEndpointUrl + '/crab-parachain',
      laneId: '',
    },
    'pangolin-dvm': {
      url: this.backingEndpointUrl,
      laneId: '0x70616c69',
    },
    'pangolin-parachain': {
      url: this.issuingEndpointUrl,
      laneId: '0x70616c69',
    },
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordFromThegraph(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) {id, sender, receiver, amount, fee, timestamp, transaction}}`;
  }

  getRecordFromSubql(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: TIMESTAMP_ASC, filter: {id: {greaterThan: "${latestNonce}"}}) {totalCount nodes{id, amount, timestamp, transaction, sender, receiver, fee}}}`;
  }
}
