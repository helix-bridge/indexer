import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, TransferT3 } from '../base/TransferServiceT3';

@Injectable()
export class TransferService extends BaseTransferServiceT3 {
  private readonly backingSubgraphUrl = this.configService.get<string>('S2S_BACKING');
  private readonly issuingSubgraphUrl = this.configService.get<string>('S2S_ISSUING');
  private readonly subql = this.configService.get<string>('SUBQL');

  formalChainTransfers: TransferT3[] = [
    {
      source: {
        chain: 'crab-dvm',
        url: this.backingSubgraphUrl + '/crab',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'darwinia-dvm',
        url: this.issuingSubgraphUrl + '/darwinia',
        feeToken: 'RING',
      },
      isLock: true,
      symbols: [
        {
          from: 'WCRAB',
          to: 'xWCRAB',
          address: '0x2d2b97ea380b0185e9fdf8271d1afb5d2bf18329',
        },
      ],
    },
    {
      source: {
        chain: 'darwinia-dvm',
        url: this.issuingSubgraphUrl + '/darwinia',
        feeToken: 'RING',
      },
      target: {
        chain: 'crab-dvm',
        url: this.backingSubgraphUrl + '/crab',
        feeToken: 'CRAB',
      },
      isLock: false,
      symbols: [
        {
          from: 'xWCRAB',
          to: 'WCRAB',
          address: '0x656567eb75b765fc320783cc6edd86bd854b2305',
        },
      ],
    },
    {
      source: {
        chain: 'crab-dvm',
        url: this.issuingSubgraphUrl + '/crab',
        feeToken: 'CRAB',
      },
      target: {
        chain: 'darwinia-dvm',
        url: this.backingSubgraphUrl + '/darwinia',
        feeToken: 'RING',
      },
      isLock: false,
      symbols: [
        {
          from: 'WRING',
          to: 'xWRING',
          address: '0x273131f7cb50ac002bdd08ca721988731f7e1092',
        },
      ],
    },
    {
      source: {
        chain: 'darwinia-dvm',
        url: this.backingSubgraphUrl + '/darwinia',
        feeToken: 'RING',
      },
      target: {
        chain: 'crab-dvm',
        url: this.issuingSubgraphUrl + '/crab',
        feeToken: 'CRAB',
      },
      isLock: true,
      symbols: [
        {
          from: 'xWRING',
          to: 'WRING',
          address: '0xe7578598aac020abfb918f33a20fad5b71d670b4',
        },
      ],
    },
  ];

  testChainTransfers: TransferT3[] = [];

  dispatchEndPoints = {
    crab: this.subql + 'crab',
    darwinia: this.subql + 'darwinia',
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: start_timestamp, orderDirection: asc, skip: ${latestNonce}) {id, sender, receiver, token, amount, fee, start_timestamp, transaction_hash, is_native}}`;
  }
}
