import { ConfigService } from '@nestjs/config';
import { AddressToken } from './AddressToken';

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

export enum Level0Indexer {
  thegraph,
  ponder,
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

export interface PartnerSymbol {
  key: string;
  symbol: string;
  address: string;
  outerAddress: string;
  protocolFee: number;
  decimals: number;
}

export interface Channel {
  chain: string;
  channel: string;
}

export interface PartnerT2 {
  chainId: number;
  chain: string;
  url: string; // record api endpoint
  level0Indexer: number;
  bridge: string;
  symbols: PartnerSymbol[];
  channels: Channel[];
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
