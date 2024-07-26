import { ConfigService } from '@nestjs/config';
import { AddressToken } from './AddressToken';
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

export enum Level0IndexerType {
  thegraph,
  ponder,
  envio,
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

export interface Level0Indexer {
  indexerType: Level0IndexerType;
  url: string;
}

export interface PartnerT2 {
  level0Indexers: Level0Indexer[];
  chainConfig: HelixChainConf;
}

export abstract class BaseTransferServiceT2 extends AddressToken {
  abstract formalChainTransfers: PartnerT2[];
  abstract testChainTransfers: PartnerT2[];

  isTest: boolean;

  constructor(configService: ConfigService) {
    super();
    this.isTest = configService.get<string>('CHAIN_TYPE') === 'test';
  }

  get transfers(): PartnerT2[] {
    return this.isTest ? this.testChainTransfers : this.formalChainTransfers;
  }
}
