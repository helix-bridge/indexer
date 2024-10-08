import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT3, PartnerT3 } from '../base/TransferServiceT3';
import { HelixChain } from '@helixbridge/helixconf';

@Injectable()
export class TransferService extends BaseTransferServiceT3 {
  private readonly lnEthereumDefaultEndpoint = this.configService.get<string>(
    'LN_ETHEREUM_DEFAULT_ENDPOINT'
  );
  private readonly lnEthereumOppositeEndpoint = this.configService.get<string>(
    'LN_ETHEREUM_OPPOSITE_ENDPOINT'
  );
  private readonly lnLineaDefaultEndpoint = this.configService.get<string>(
    'LN_LINEA_DEFAULT_ENDPOINT'
  );
  private readonly lnLineaOppositeEndpoint = this.configService.get<string>(
    'LN_LINEA_OPPOSITE_ENDPOINT'
  );
  private readonly lnMantleDefaultEndpoint = this.configService.get<string>(
    'LN_MANTLE_DEFAULT_ENDPOINT'
  );
  private readonly lnMantleOppositeEndpoint = this.configService.get<string>(
    'LN_MANTLE_OPPOSITE_ENDPOINT'
  );
  private readonly lnArbitrumDefaultEndpoint = this.configService.get<string>(
    'LN_ARBITRUM_DEFAULT_ENDPOINT'
  );
  private readonly lnArbitrumOppositeEndpoint = this.configService.get<string>(
    'LN_ARBITRUM_OPPOSITE_ENDPOINT'
  );
  private readonly lnZkSyncDefaultEndpoint = this.configService.get<string>(
    'LN_ZKSYNC_DEFAULT_ENDPOINT'
  );
  private readonly lnPolygonDefaultEndpoint = this.configService.get<string>(
    'LN_POLYGON_DEFAULT_ENDPOINT'
  );
  private readonly lnScrollDefaultEndpoint = this.configService.get<string>(
    'LN_SCROLL_DEFAULT_ENDPOINT'
  );
  private readonly lnBaseDefaultEndpoint = this.configService.get<string>(
    'LN_BASE_DEFAULT_ENDPOINT'
  );
  private readonly lnDarwiniaDefaultEndpoint = this.configService.get<string>(
    'LN_DARWINIA_DEFAULT_ENDPOINT'
  );
  private readonly lnDarwiniaOppositeEndpoint = this.configService.get<string>(
    'LN_DARWINIA_OPPOSITE_ENDPOINT'
  );
  private readonly lnCrabDefaultEndpoint = this.configService.get<string>(
    'LN_CRAB_DEFAULT_ENDPOINT'
  );
  private readonly lnBscDefaultEndpoint = this.configService.get<string>('LN_BSC_DEFAULT_ENDPOINT');
  private readonly lnOpDefaultEndpoint = this.configService.get<string>('LN_OP_DEFAULT_ENDPOINT');

  formalChainTransfers: PartnerT3[] = [
    {
      defaultEndpoint: this.lnEthereumDefaultEndpoint,
      oppositeEndpoint: this.lnEthereumOppositeEndpoint,
      chainConfig: HelixChain.ethereum,
    },
    {
      defaultEndpoint: this.lnArbitrumDefaultEndpoint,
      oppositeEndpoint: this.lnArbitrumOppositeEndpoint,
      chainConfig: HelixChain.arbitrum,
    },
    {
      defaultEndpoint: this.lnPolygonDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.polygon,
    },
    {
      defaultEndpoint: this.lnZkSyncDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.zksync,
    },
    {
      defaultEndpoint: this.lnScrollDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.scroll,
    },
    {
      defaultEndpoint: this.lnDarwiniaDefaultEndpoint,
      oppositeEndpoint: this.lnDarwiniaOppositeEndpoint,
      chainConfig: HelixChain.darwiniaDvm,
    },
    {
      defaultEndpoint: this.lnBscDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.bsc,
    },
    {
      defaultEndpoint: this.lnBaseDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.base,
    },
    {
      defaultEndpoint: this.lnOpDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.op,
    },
    {
      defaultEndpoint: this.lnLineaDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.linea,
    },
  ];

  testChainTransfers: PartnerT3[] = [
    {
      defaultEndpoint: this.lnEthereumDefaultEndpoint,
      oppositeEndpoint: this.lnEthereumOppositeEndpoint,
      chainConfig: HelixChain.sepolia,
    },
    {
      defaultEndpoint: this.lnArbitrumDefaultEndpoint,
      oppositeEndpoint: this.lnArbitrumOppositeEndpoint,
      chainConfig: HelixChain.arbitrumSepolia,
    },
    {
      defaultEndpoint: this.lnZkSyncDefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.zksyncSepolia,
    },
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
