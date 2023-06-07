import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly backingSubgraphUrl = this.configService.get<string>('S2S_BACKING');
  private readonly issuingSubgraphUrl = this.configService.get<string>('S2S_ISSUING');
  private readonly subql = this.configService.get<string>('SUBSTRATE_DVM_ENDPOINT');

  formalChainTransfers: TransferT1[] = [
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
      bridge: 'crab2darwinia',
      symbols: [
        {
          from: 'WCRAB',
          to: 'xWCRAB',
          address: '0x2d2b97ea380b0185e9fdf8271d1afb5d2bf18329',
          toAddress: '0x656567eb75b765fc320783cc6edd86bd854b2305',
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
      bridge: 'darwinia2crab',
      symbols: [
        {
          from: 'xWCRAB',
          to: 'WCRAB',
          address: '0x656567eb75b765fc320783cc6edd86bd854b2305',
          toAddress: '0x2d2b97ea380b0185e9fdf8271d1afb5d2bf18329',
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
      bridge: 'crab2darwinia',
      symbols: [
        {
          from: 'xWRING',
          to: 'WRING',
          address: '0x273131f7cb50ac002bdd08ca721988731f7e1092',
          toAddress: '0xe7578598aac020abfb918f33a20fad5b71d670b4',
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
      bridge: 'darwinia2crab',
      symbols: [
        {
          from: 'WRING',
          to: 'xWRING',
          address: '0xe7578598aac020abfb918f33a20fad5b71d670b4',
          toAddress: '0x273131f7cb50ac002bdd08ca721988731f7e1092',
        },
      ],
    },
  ];

  testChainTransfers: TransferT1[] = [];

  dispatchEndPoints = {
    crab: this.subql + 'crab',
    darwinia: this.subql + 'darwinia',
  };

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
