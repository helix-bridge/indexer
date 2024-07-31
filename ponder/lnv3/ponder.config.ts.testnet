import { createConfig } from "@ponder/core";
import { http } from "viem";

import { HelixLnBridgeV3Abi } from "./abis/HelixLnBridgeV3Abi";

export default createConfig({
  networks: {
    "taiko-hekla": {
      chainId: 167009,
      transport: http(process.env.PONDER_RPC_URL_167009),
      pollingInterval: 1000,
      maxRequestsPerSecond: 10,
      maxHistoricalTaskConcurrency: 10
    },
  },
  contracts: {
    HelixLnBridgeV3: {
      abi: HelixLnBridgeV3Abi,
      maxBlockRange: 2000,
      network: {
        "taiko-hekla": {
          startBlock: 109210,
          address: "0xD476650e03a45E70202b0bcAfa04E1513920f83a",
        },
      },
    },
  },
});
