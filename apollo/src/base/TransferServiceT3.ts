import { ConfigService } from '@nestjs/config';
import { HelixChainConf } from '@helixbridge/helixconf';

/*
This model is suitable for multi-chain interconnection scenarios,
where each chain connects all other chains at the same time.
And we configure a collection of chains, where all chains in the collection may be connected to each other with bridges of the same model
*/

export enum RecordStatus {
  pending,
  pendingToRefund,
  pendingToClaim,
  success,
  refunded,
  pendingToConfirmRefund,
  // failed and cannot refund
  failed,
}

export interface FetchCacheInfo {
  latestNonce: number;
  isSyncingHistory: boolean;
  skip: number;
}

export interface BridgeBaseConfigure {
  name: string;
  fetchHistoryDataFirst: number;
  fetchSendDataInterval: number;
  takeEachTime: number;
}

export interface PartnerT3 {
  defaultEndpoint: string;
  oppositeEndpoint: string;
  chainConfig: HelixChainConf;
}

export abstract class BaseTransferServiceT3 {
  abstract formalChainTransfers: PartnerT3[];
  abstract testChainTransfers: PartnerT3[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): PartnerT3[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}
