import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransferServiceT1, TransferT1 } from '../base/TransferServiceT1';

@Injectable()
export class TransferService extends BaseTransferServiceT1 {
  private readonly ethereumArb2EthLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_A2E_LNV2_ENDPOINT'
  );
  private readonly arbitrumArb2EthLnv2Endpoint = this.configService.get<string>(
    'ARBITRUM_A2E_LNV2_ENDPOINT'
  );
  private readonly ethereumEth2ArbLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_E2A_LNV2_ENDPOINT'
  );
  private readonly arbitrumEth2ArbLnv2Endpoint = this.configService.get<string>(
    'ARBITRUM_E2A_LNV2_ENDPOINT'
  );
  private readonly ethereumEth2ZkLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_ETH2ZK_LNV2_ENDPOINT'
  );
  private readonly zkSyncEth2ZkLnv2Endpoint = this.configService.get<string>(
    'ZKSYNC_ETH2ZK_LNV2_ENDPOINT'
  );
  private readonly zkSyncZk2EthLnv2Endpoint = this.configService.get<string>(
    'ZKSYNC_ZK2ETH_LNV2_ENDPOINT'
  );
  private readonly ethereumZk2EthLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_ZK2ETH_LNV2_ENDPOINT'
  );
  private readonly lineaLinea2EthLnv2Endpoint = this.configService.get<string>(
    'LINEA_LINEA2ETH_LNV2_ENDPOINT'
  );
  private readonly ethereumLinea2EthLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_LINEA2ETH_LNV2_ENDPOINT'
  );
  private readonly lineaEth2LineaLnv2Endpoint = this.configService.get<string>(
    'LINEA_ETH2LINEA_LNV2_ENDPOINT'
  );
  private readonly ethereumEth2LineaLnv2Endpoint = this.configService.get<string>(
    'ETHEREUM_ETH2LINEA_LNV2_ENDPOINT'
  );

  formalChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'arbitrum',
        url: this.arbitrumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'ethereum',
        url: this.ethereumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      // this field `isLock` here used to indict the direction of the general message
      isLock: true,
      bridge: 'arb2ethLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0x9e523234d36973f9e38642886197d023c88e307e',
          toAddress: '0x9469d013805bffb7d3debe5e7839237e535ec483',
          protocolFee: 300000000000000000000,
        },
      ],
    },

  ];

  testChainTransfers: TransferT1[] = [
    {
      source: {
        chain: 'arbitrum-goerli',
        url: this.arbitrumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'goerli',
        url: this.ethereumArb2EthLnv2Endpoint,
        feeToken: '',
      },
      isLock: true,
      bridge: 'arb2ethLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0xfbad806bdf9cec2943be281fb355da05068de925',
          toAddress: '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e',
          protocolFee: 1500000000000000000,
        },
        {
          from: 'USDC',
          to: 'USDC',
          address: '0xea70a40df1432a1b38b916a51fb81a4cc805a963',
          toAddress: '0xd35cceead182dcee0f148ebac9447da2c4d449c4',
          protocolFee: 1000000,
        },
      ],
    },
    {
      source: {
        chain: 'goerli',
        url: this.ethereumEth2ArbLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'arbitrum-goerli',
        url: this.arbitrumEth2ArbLnv2Endpoint,
        feeToken: '',
      },
      isLock: false,
      bridge: 'eth2arbLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e',
          toAddress: '0xfbad806bdf9cec2943be281fb355da05068de925',
          protocolFee: 1500000000000000000,
        },
        {
          from: 'USDC',
          to: 'USDC',
          address: '0xd35cceead182dcee0f148ebac9447da2c4d449c4',
          toAddress: '0xea70a40df1432a1b38b916a51fb81a4cc805a963',
          protocolFee: 1000000,
        },
      ],
    },
    {
      source: {
        chain: 'goerli',
        url: this.ethereumEth2ZkLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'zksync-goerli',
        url: this.zkSyncEth2ZkLnv2Endpoint,
        feeToken: '',
      },
      isLock: false,
      bridge: 'eth2zkLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e',
          toAddress: '0x61c31a1fa4a8d765e63d4285f368aa2f4d912dbb',
          protocolFee: 1500000000000000000,
        },
        {
          from: 'USDC',
          to: 'USDC',
          address: '0xd35cceead182dcee0f148ebac9447da2c4d449c4',
          toAddress: '0x0faf6df7054946141266420b43783387a78d82a9',
          protocolFee: 1500000,
        },
        {
          from: 'ETH',
          to: 'zkETH',
          address: '0x0000000000000000000000000000000000000000',
          toAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 100000000000000,
        }
      ],
    },
    {
      source: {
        chain: 'zksync-goerli',
        url: this.zkSyncZk2EthLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'goerli',
        url: this.ethereumZk2EthLnv2Endpoint,
        feeToken: '',
      },
      isLock: true,
      bridge: 'zk2ethLnv20',
      symbols: [
        {
          from: 'RING',
          to: 'RING',
          address: '0x61c31a1fa4a8d765e63d4285f368aa2f4d912dbb',
          toAddress: '0x1836bafa3016dd5ce543d0f7199cb858ec69f41e',
          protocolFee: 1500000000000000000,
        },
        {
          from: 'USDC',
          to: 'USDC',
          address: '0x0faf6df7054946141266420b43783387a78d82a9',
          toAddress: '0xd35cceead182dcee0f148ebac9447da2c4d449c4',
          protocolFee: 1500000,
        },
        {
          from: 'zkETH',
          to: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          toAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 100000000000000,
        }
      ]
    },
    {
      source: {
        chain: 'linea-goerli',
        url: this.lineaLinea2EthLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'goerli',
        url: this.ethereumLinea2EthLnv2Endpoint,
        feeToken: '',
      },
      isLock: true,
      bridge: 'linea2ethLnv20',
      symbols: [
        {
          from: 'USDC',
          to: 'USDC',
          address: '0xb4257f31750961c8e536f5cfcbb3079437700416',
          toAddress: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
          protocolFee: 1500000,
        },
        {
          from: 'lineaETH',
          to: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          toAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 100000000000000,
        }
      ]
    },
    {
      source: {
        chain: 'goerli',
        url: this.ethereumEth2LineaLnv2Endpoint,
        feeToken: '',
      },
      target: {
        chain: 'linea-goerli',
        url: this.lineaEth2LineaLnv2Endpoint,
        feeToken: '',
      },
      isLock: false,
      bridge: 'eth2lineaLnv20',
      symbols: [
        {
          from: 'USDC',
          to: 'USDC',
          address: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
          toAddress: '0xb4257f31750961c8e536f5cfcbb3079437700416',
          protocolFee: 1500000,
        },
        {
          from: 'lineaETH',
          to: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          toAddress: '0x0000000000000000000000000000000000000000',
          protocolFee: 100000000000000,
        }
      ]
    }
  ];

  readonly isTest = this.configService.get<string>('CHAIN_TYPE') === 'test';

  constructor(public configService: ConfigService) {
    super(configService);
  }
}
