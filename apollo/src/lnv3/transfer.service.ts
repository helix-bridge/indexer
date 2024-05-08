import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  private readonly beraEndpoint = this.configService.get<string>('BERA_LNV3_ENDPOINT');
  private readonly taikoEndpoint = this.configService.get<string>('TAIKO_LNV3_ENDPOINT');
  private readonly astarZkEVMEndpoint = this.configService.get<string>('ASTAR_ZKEVM_LNV3_ENDPOINT');
  private readonly morphEndpoint = this.configService.get<string>('MORPH_LNV3_ENDPOINT');

  public readonly ponderEndpoint = this.configService.get<string>('PONDER_LNV3_ENDPOINT');

  formalChainTransfers: PartnerT2[] = [
    {
      chainId: 137,
      chain: 'polygon',
      url: this.polygonEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'RING',
          symbol: 'RING',
          address: '0x9C1C23E60B72Bc88a043bf64aFdb16A02540Ae8f',
          outerAddress: '0x9C1C23E60B72Bc88a043bf64aFdb16A02540Ae8f',
          protocolFee: 30000000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          outerAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
      channels: [
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
        {
          chain: 'bsc',
          channel: 'layerzero',
        },
        {
          chain: 'linea',
          channel: 'layerzero',
        },
        {
          chain: 'op',
          channel: 'layerzero',
        },
        {
          chain: 'gnosis',
          channel: 'layerzero',
        },
        {
          chain: 'mantle',
          channel: 'layerzero',
        },
        {
          chain: 'scroll',
          channel: 'layerzero',
        },
        {
          chain: 'darwinia-dvm',
          channel: 'msgline',
        },
      ],
    },
    {
      chainId: 42161,
      chain: 'arbitrum',
      url: this.arbitrumEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'RING',
          symbol: 'RING',
          address: '0x9e523234D36973f9e38642886197D023C88e307e',
          outerAddress: '0x9e523234D36973f9e38642886197D023C88e307e',
          protocolFee: 30000000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
          outerAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
          protocolFee: 100000,
          decimals: 6,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 10000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'polygon',
          channel: 'layerzero',
        },
        {
          chain: 'bsc',
          channel: 'layerzero',
        },
        {
          chain: 'linea',
          channel: 'layerzero',
        },
        {
          chain: 'op',
          channel: 'layerzero',
        },
        {
          chain: 'gnosis',
          channel: 'layerzero',
        },
        {
          chain: 'mantle',
          channel: 'layerzero',
        },
        {
          chain: 'scroll',
          channel: 'layerzero',
        },
        {
          chain: 'darwinia-dvm',
          channel: 'msgline',
        },
        {
          chain: 'blast',
          channel: 'layerzero',
        },
        {
          chain: 'astar-zkevm',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 56,
      chain: 'bsc',
      url: this.bscEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x55d398326f99059fF775485246999027B3197955',
          outerAddress: '0x55d398326f99059fF775485246999027B3197955',
          protocolFee: 100000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'polygon',
          channel: 'layerzero',
        },
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
        {
          chain: 'linea',
          channel: 'layerzero',
        },
        {
          chain: 'op',
          channel: 'layerzero',
        },
        {
          chain: 'gnosis',
          channel: 'layerzero',
        },
        {
          chain: 'mantle',
          channel: 'layerzero',
        },
        {
          chain: 'scroll',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 59144,
      chain: 'linea',
      url: this.lineaEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
          outerAddress: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
          protocolFee: 100000,
          decimals: 6,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 10000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'polygon',
          channel: 'layerzero',
        },
        {
          chain: 'bsc',
          channel: 'layerzero',
        },
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
        {
          chain: 'op',
          channel: 'layerzero',
        },
        {
          chain: 'gnosis',
          channel: 'layerzero',
        },
        {
          chain: 'mantle',
          channel: 'layerzero',
        },
        {
          chain: 'scroll',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 10,
      chain: 'op',
      url: this.opEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
          outerAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
          protocolFee: 100000,
          decimals: 6,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 10000000000000,
          decimals: 18,
        }
      ],
      channels: [
        {
          chain: 'polygon',
          channel: 'layerzero',
        },
        {
          chain: 'bsc',
          channel: 'layerzero',
        },
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
        {
          chain: 'linea',
          channel: 'layerzero',
        },
        {
          chain: 'gnosis',
          channel: 'layerzero',
        },
        {
          chain: 'mantle',
          channel: 'layerzero',
        },
        {
          chain: 'scroll',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 100,
      chain: 'gnosis',
      url: this.gnosisEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
          outerAddress: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
      channels: [
        {
          chain: 'polygon',
          channel: 'layerzero',
        },
        {
          chain: 'bsc',
          channel: 'layerzero',
        },
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
        {
          chain: 'linea',
          channel: 'layerzero',
        },
        {
          chain: 'op',
          channel: 'layerzero',
        },
        {
          chain: 'mantle',
          channel: 'layerzero',
        },
        {
          chain: 'scroll',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 5000,
      chain: 'mantle',
      url: this.mantleEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
          outerAddress: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
      channels: [
        {
          chain: 'polygon',
          channel: 'layerzero',
        },
        {
          chain: 'bsc',
          channel: 'layerzero',
        },
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
        {
          chain: 'linea',
          channel: 'layerzero',
        },
        {
          chain: 'op',
          channel: 'layerzero',
        },
        {
          chain: 'gnosis',
          channel: 'layerzero',
        },
        {
          chain: 'scroll',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 534352,
      chain: 'scroll',
      url: this.scrollEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
          outerAddress: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
          protocolFee: 100000,
          decimals: 6,
        },
      ],
      channels: [
        {
          chain: 'polygon',
          channel: 'layerzero',
        },
        {
          chain: 'bsc',
          channel: 'layerzero',
        },
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
        {
          chain: 'linea',
          channel: 'layerzero',
        },
        {
          chain: 'op',
          channel: 'layerzero',
        },
        {
          chain: 'gnosis',
          channel: 'layerzero',
        },
        {
          chain: 'mantle',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 46,
      chain: 'darwinia-dvm',
      url: this.darwiniaEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'RING',
          symbol: 'RING',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 30000000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum',
          channel: 'msgline',
        },
        {
          chain: 'polygon',
          channel: 'msgline',
        },
      ],
    },
    {
      chainId: 81457,
      chain: 'blast',
      url: this.blastEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 10000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 3776,
      chain: 'astar-zkevm',
      url: this.astarZkEVMEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 10000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum',
          channel: 'layerzero',
        },
      ],
    },
  ];

  testChainTransfers: PartnerT2[] = [
    {
      chainId: 11155111,
      chain: 'sepolia',
      url: this.ethereumEndpoint,
      level0Indexer: Level0Indexer.ponder,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x0ac58Df0cc3542beC4cDa71B16D06C3cCc39f405',
          outerAddress: '0x0ac58Df0cc3542beC4cDa71B16D06C3cCc39f405',
          protocolFee: 10000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
          outerAddress: '0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB',
          protocolFee: 10000000000000000,
          decimals: 18,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum-sepolia',
          channel: 'layerzero',
        },
        {
          chain: 'zksync-sepolia',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 421614,
      chain: 'arbitrum-sepolia',
      url: this.arbitrumEndpoint,
      level0Indexer: Level0Indexer.thegraph,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x8A87497488073307E1a17e8A12475a94Afcb413f',
          outerAddress: '0x8A87497488073307E1a17e8A12475a94Afcb413f',
          protocolFee: 10000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x3b8Bb7348D4F581e67E2498574F73e4B9Fc51855',
          outerAddress: '0x3b8Bb7348D4F581e67E2498574F73e4B9Fc51855',
          protocolFee: 10000000000000000,
          decimals: 18,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'sepolia',
          channel: 'layerzero',
        },
        {
          chain: 'zksync-sepolia',
          channel: 'layerzero',
        },
        {
          chain: 'taiko',
          channel: 'layerzero',
        },
        {
          chain: 'bera',
          channel: 'layerzero',
        },
        {
          chain: 'morph',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 300,
      chain: 'zksync-sepolia',
      url: this.zksyncEndpoint,
      level0Indexer: Level0Indexer.ponder,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x253adBFE99Fcd096B9b5502753F96CF78D42eaD0',
          outerAddress: '0x253adBFE99Fcd096B9b5502753F96CF78D42eaD0',
          protocolFee: 10000,
          decimals: 6,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x3350f1ef046e21E052dCbA60Fc575919CCaFEdeb',
          outerAddress: '0x3350f1ef046e21E052dCbA60Fc575919CCaFEdeb',
          protocolFee: 10000,
          decimals: 6,
        },
        {
          key: 'ETH',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          outerAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum-sepolia',
          channel: 'layerzero',
        },
        {
          chain: 'sepolia',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 167008,
      chain: 'taiko',
      url: this.taikoEndpoint,
      level0Indexer: Level0Indexer.ponder,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x3F7DF5866591e7E48D18C8EbeAE61Bc343a63283',
          outerAddress: '0x3F7DF5866591e7E48D18C8EbeAE61Bc343a63283',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x89AF830781A2C1d3580Db930bea11094F55AfEae',
          outerAddress: '0x89AF830781A2C1d3580Db930bea11094F55AfEae',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum-sepolia',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 80085,
      chain: 'bera',
      url: this.beraEndpoint,
      level0Indexer: Level0Indexer.ponder,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x89AF830781A2C1d3580Db930bea11094F55AfEae',
          outerAddress: '0x89AF830781A2C1d3580Db930bea11094F55AfEae',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x463D1730a8527CA58d48EF70C7460B9920346567',
          outerAddress: '0x463D1730a8527CA58d48EF70C7460B9920346567',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum-sepolia',
          channel: 'layerzero',
        },
      ],
    },
    {
      chainId: 2710,
      chain: 'morph',
      url: this.morphEndpoint,
      level0Indexer: Level0Indexer.ponder,
      bridge: 'lnv3',
      symbols: [
        {
          key: 'USDC',
          symbol: 'USDC',
          address: '0x89AF830781A2C1d3580Db930bea11094F55AfEae',
          outerAddress: '0x89AF830781A2C1d3580Db930bea11094F55AfEae',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
        {
          key: 'USDT',
          symbol: 'USDT',
          address: '0x463D1730a8527CA58d48EF70C7460B9920346567',
          outerAddress: '0x463D1730a8527CA58d48EF70C7460B9920346567',
          protocolFee: 1000000000000000,
          decimals: 18,
        },
      ],
      channels: [
        {
          chain: 'arbitrum-sepolia',
          channel: 'layerzero',
        },
      ],
    },
  ];

  readonly addressToTokenInfo: { [key: string]: AddressTokenMap } = {};

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
