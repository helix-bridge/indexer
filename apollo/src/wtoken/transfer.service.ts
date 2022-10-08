import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly endpoint = this.configService.get<string>('SUBSTRATE_DVM_ENDPOINT');

  formalChainTransfers: TransferT1[] = [
      {
          source: {
              chain: 'darwinia-dvm',
              url: this.endpoint + "/darwinia",
              feeToken: 'RING',
              token: 'RING',
          },
          target: {
              chain: 'darwinia-dvm',
              url: this.endpoint + "/darwinia",
              feeToken: 'RING',
              token: 'WRING',
          }
      },
  ];

  testChainTransfers: TransferT1[] = [];

  constructor(public configService: ConfigService) {
    super(configService);
  }

  getRecordQueryString(first: number, latestNonce: bigint | number) {
    return `query { transferRecords (first: ${first}, orderBy: timestamp, orderDirection: asc, skip: ${latestNonce}) {id, account, amount, timestamp, direction}}`;
  }
}
 
