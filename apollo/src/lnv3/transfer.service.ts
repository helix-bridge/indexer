import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelixChain } from '@helixbridge/helixconf';
import { BaseTransferServiceT2, PartnerT2, Level0IndexerType } from '../base/TransferServiceT2';
import { AddressTokenMap } from '../base/AddressToken';

@Injectable()
export class TransferService extends BaseTransferServiceT2 {
  private readonly ethereumEndpoint = this.configService.get<string>('ETHEREUM_LNV3_ENDPOINT');
  private readonly arbitrumEndpoint = this.configService.get<string>('ARBITRUM_LNV3_ENDPOINT');
  private readonly zksyncEndpoint = this.configService.get<string>('ZKSYNC_LNV3_ENDPOINT');
  private readonly polygonEndpoint = this.configService.get<string>('POLYGON_LNV3_ENDPOINT');
  private readonly bscEndpoint = this.configService.get<string>('BSC_LNV3_ENDPOINT');
  private readonly lineaEndpoint = this.configService.get<string>('LINEA_LNV3_ENDPOINT');
  private readonly opEndpoint = this.configService.get<string>('OP_LNV3_ENDPOINT');
  private readonly gnosisEndpoint = this.configService.get<string>('GNOSIS_LNV3_ENDPOINT');
  private readonly mantleEndpoint = this.configService.get<string>('MANTLE_LNV3_ENDPOINT');
  private readonly scrollEndpoint = this.configService.get<string>('SCROLL_LNV3_ENDPOINT');
  private readonly darwiniaEndpoint = this.configService.get<string>('DARWINIA_LNV3_ENDPOINT');
  private readonly blastEndpoint = this.configService.get<string>('BLAST_LNV3_ENDPOINT');
  private readonly baseEndpoint = this.configService.get<string>('BASE_LNV3_ENDPOINT');
  private readonly beraEndpoint = this.configService.get<string>('BERA_LNV3_ENDPOINT');
  private readonly taikoEndpoint = this.configService.get<string>('TAIKO_LNV3_ENDPOINT');
  private readonly astarZkEVMEndpoint = this.configService.get<string>('ASTAR_ZKEVM_LNV3_ENDPOINT');
  private readonly morphEndpoint = this.configService.get<string>('MORPH_LNV3_ENDPOINT');
  private readonly moonbeamEndpoint = this.configService.get<string>('MOONBEAM_LNV3_ENDPOINT');
  private readonly zircuitEndpoint = this.configService.get<string>('ZIRCUIT_LNV3_ENDPOINT');

  public readonly ponderEndpoint = this.configService.get<string>('PONDER_LNV3_ENDPOINT');
  private readonly dnvioEndpoint = this.configService.get<string>('LNV3_ENVIO_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.polygonEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.polygon,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.arbitrumEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.arbitrum,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.bscEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.bsc,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.lineaEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.linea,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.opEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.op,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.gnosisEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.gnosis,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.mantleEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.mantle,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.scrollEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.scroll,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.darwiniaEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.darwiniaDvm,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.blastEndpoint,
        },
      ],
      chainConfig: HelixChain.blast,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.astarZkEVMEndpoint,
        },
      ],
      chainConfig: HelixChain.astarZkevm,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.moonbeamEndpoint,
        },
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.moonbeam,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.avalanche,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.envio,
          url: this.dnvioEndpoint,
        },
      ],
      chainConfig: HelixChain.base,
    },
  ];

  testChainTransfers: PartnerT2[] = [
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.ethereumEndpoint,
        },
      ],
      chainConfig: HelixChain.sepolia,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.arbitrumEndpoint,
        },
      ],
      chainConfig: HelixChain.arbitrumSepolia,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.zksyncEndpoint,
        },
      ],
      chainConfig: HelixChain.zksyncSepolia,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.ponder,
          url: this.ponderEndpoint,
        },
      ],
      chainConfig: HelixChain.taikoHekla,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.beraEndpoint,
        },
      ],
      chainConfig: HelixChain.bera,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.morphEndpoint,
        },
      ],
      chainConfig: HelixChain.morph,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.baseEndpoint,
        },
      ],
      chainConfig: HelixChain.baseSepolia,
    },
    {
      level0Indexers: [
        {
          indexerType: Level0IndexerType.thegraph,
          url: this.zircuitEndpoint,
        },
      ],
      chainConfig: HelixChain.zircuit,
    },
  ];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
