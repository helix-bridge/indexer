import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseBridgeTransferService, BridgeChain } from '../base/BridgeTransferService';

@Injectable()
export class TransferService extends BaseBridgeTransferService {
  private readonly hecoEndpoint = this.configService.get<string>('HECO_ENDPOINT');
  private readonly crabSmartEndpoint = this.configService.get<string>('CRAB_SMART_CHAIN_ENDPOINT');

  formalChainTransfers: BridgeChain[] = [
    {
      chainId: 128,
      chain: 'heco',
      url: this.hecoEndpoint,
      token: 'RING',
      feeToken: 'RING',
      blockTime: 3,
      feeDecimals: 1e18,
    },
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.crabSmartEndpoint,
      token: 'xRING',
      feeToken: 'xRING',
      blockTime: 6,
      feeDecimals: 1e9,
    },
  ];

  testChainTransfers: BridgeChain[] = [];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
