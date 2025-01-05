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
  private readonly lnArbitrumDefaultEndpoint = this.configService.get<string>(
    'LN_ARBITRUM_DEFAULT_ENDPOINT'
  );
  private readonly lnArbitrumOppositeEndpoint = this.configService.get<string>(
    'LN_ARBITRUM_OPPOSITE_ENDPOINT'
  );
  private readonly lnZkSyncDefaultEndpoint = this.configService.get<string>(
    'LN_ZKSYNC_DEFAULT_ENDPOINT'
  );

  private readonly lnv2DefaultEndpoint = this.configService.get<string>('LNV2_DEFAULT_ENDPOINT');
  private readonly lnv2OppositeEndpoint = this.configService.get<string>('LNV2_OPPOSITE_ENDPOINT');

  formalChainTransfers: PartnerT3[] = [
    {
      defaultEndpoint: this.lnv2DefaultEndpoint,
      oppositeEndpoint: this.lnv2OppositeEndpoint,
      chainConfig: HelixChain.ethereum,
    },
    {
      defaultEndpoint: this.lnv2DefaultEndpoint,
      oppositeEndpoint: this.lnv2OppositeEndpoint,
      chainConfig: HelixChain.arbitrum,
    },
    {
      defaultEndpoint: this.lnv2DefaultEndpoint,
      oppositeEndpoint: null,
      chainConfig: HelixChain.polygon,
    },
    {
      defaultEndpoint: this.lnv2DefaultEndpoint,
      oppositeEndpoint: this.lnv2OppositeEndpoint,
      chainConfig: HelixChain.darwiniaDvm,
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
