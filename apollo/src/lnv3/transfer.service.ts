import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelixChain } from '@helixbridge/helixconf';
import { BaseTransferServiceT2, PartnerT2, Level0Indexer } from '../base/TransferServiceT2';
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

  public readonly ponderEndpoint = this.configService.get<string>('PONDER_LNV3_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.polygonEndpoint,
      chainConfig: HelixChain.polygon,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.arbitrumEndpoint,
      chainConfig: HelixChain.arbitrum,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.bscEndpoint,
      chainConfig: HelixChain.bsc,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.lineaEndpoint,
      chainConfig: HelixChain.linea,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.opEndpoint,
      chainConfig: HelixChain.op,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.gnosisEndpoint,
      chainConfig: HelixChain.gnosis,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.mantleEndpoint,
      chainConfig: HelixChain.mantle,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.scrollEndpoint,
      chainConfig: HelixChain.scroll,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.darwiniaEndpoint,
      chainConfig: HelixChain.darwiniaDvm,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.blastEndpoint,
      chainConfig: HelixChain.blast,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.astarZkEVMEndpoint,
      chainConfig: HelixChain.astarZkevm,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.moonbeamEndpoint,
      chainConfig: HelixChain.moonbeam,
    },
  ];

  testChainTransfers: PartnerT2[] = [
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.ethereumEndpoint,
      chainConfig: HelixChain.sepolia,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.arbitrumEndpoint,
      chainConfig: HelixChain.arbitrumSepolia,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.zksyncEndpoint,
      chainConfig: HelixChain.zksyncSepolia,
    },
    {
      level0Indexer: Level0Indexer.ponder,
      indexerUrl: this.taikoEndpoint,
      chainConfig: HelixChain.taikoHekla,
    },
    {
      level0Indexer: Level0Indexer.ponder,
      indexerUrl: this.beraEndpoint,
      chainConfig: HelixChain.bera,
    },
    {
      level0Indexer: Level0Indexer.ponder,
      indexerUrl: this.morphEndpoint,
      chainConfig: HelixChain.morph,
    },
    {
      level0Indexer: Level0Indexer.ponder,
      indexerUrl: this.morphEndpoint,
      chainConfig: HelixChain.morph,
    },
    {
      level0Indexer: Level0Indexer.thegraph,
      indexerUrl: this.baseEndpoint,
      chainConfig: HelixChain.baseSepolia,
    },
  ];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
