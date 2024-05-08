import { createConfig } from "@ponder/core";
import { http } from "viem";

import { HelixLnBridgeV3Abi } from "./abis/HelixLnBridgeV3Abi";

export default createConfig({
  networks: {
    "arbitrum-sepolia": {
      chainId: 421614,
      transport: http(process.env.PONDER_RPC_URL_421614),
      pollingInterval: 1000,
      maxRequestsPerSecond: 2,
      maxHistoricalTaskConcurrency: 3
    },
    "bera-artio": {
      chainId: 80085,
      transport: http(process.env.PONDER_RPC_URL_80085),
      pollingInterval: 1000,
      maxRequestsPerSecond: 1,
      maxHistoricalTaskConcurrency: 1
    },
    "morph-testnet": {
      chainId: 2710,
      transport: http(process.env.PONDER_RPC_URL_2710),
      pollingInterval: 1000,
      maxRequestsPerSecond: 1,
      maxHistoricalTaskConcurrency: 1
    },
    "sepolia": {
      chainId: 11155111,
      transport: http(process.env.PONDER_RPC_URL_11155111),
      pollingInterval: 1000,
      maxRequestsPerSecond: 1,
      maxHistoricalTaskConcurrency: 1
    },
    "zksync-sepolia": {
      chainId: 300,
      transport: http(process.env.PONDER_RPC_URL_300),
      pollingInterval: 1000,
      maxRequestsPerSecond: 1,
      maxHistoricalTaskConcurrency: 1
    },
  },
  contracts: {
    HelixLnBridgeV3: {
      abi: HelixLnBridgeV3Abi,
      maxBlockRange: 2000,
      network: {
        "arbitrum-sepolia": {
          startBlock: 6126325,
          address: "0x38627Cb033De66a1E07e73f5D0a7a7adFB6741fa",
        },
        "bera-artio": {
          startBlock: 1006527,
          address: "0x00e7EFf0826dfCDf2AA5945dFF710B48f4AA7E64",
        },
        "morph-testnet": {
          startBlock: 1420941,
          address: "0xD476650e03a45E70202b0bcAfa04E1513920f83a",
        },
        "sepolia": {
          startBlock: 5060070,
          address: "0x38627Cb033De66a1E07e73f5D0a7a7adFB6741fa",
        },
        "zksync-sepolia": {
          startBlock: 76772,
          address: "0xDc55fF59F82AA50D8A4A61dB8CcaDffD26Fb7dD2",
        },
      },
    },
  },
});
