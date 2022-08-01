import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseBridgeTransferService, BridgeChain } from '../base/BridgeTransferService';

@Injectable()
export class TransferService extends BaseBridgeTransferService {
  private readonly hecoEndpoint = this.configService.get<string>('HECO_ENDPOINT');
  private readonly crabSmartEndpoint = this.configService.get<string>('CRAB_SMART_CHAIN_ENDPOINT');
  private readonly polygonEndpoint = this.configService.get<string>('POLYGON_ENDPOINT');
  private readonly ethereumEndpoint = this.configService.get<string>('ETHEREUM_ENDPOINT');

  formalChainTransfers: BridgeChain[] = [
    {
      chainId: 128,
      chain: 'heco',
      url: this.hecoEndpoint,
      token: 'RING',
      feeToken: 'RING',
      feeDecimals: 1e18,
    },
    {
      chainId: 44,
      chain: 'crab-dvm',
      url: this.crabSmartEndpoint,
      token: 'xRING',
      feeToken: 'xRING',
      feeDecimals: 1e9,
    },
    {
      chainId: 137,
      chain: 'polygon',
      url: this.polygonEndpoint,
      token: 'RING',
      feeToken: 'RING',
      feeDecimals: 1e18,
    },
    {
      chainId: 1,
      chain: 'ethereum',
      url: this.ethereumEndpoint,
      token: 'RING',
      feeToken: 'RING',
      feeDecimals: 1e18,
    },
  ];

  testChainTransfers: BridgeChain[] = [];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
