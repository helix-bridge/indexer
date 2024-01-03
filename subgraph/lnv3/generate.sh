echo "specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: HelixLnBridgeV3
    network: $1
    source:
      address: \"$2\"
      abi: HelixLnBridgeV3
      startBlock: $3
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - TokenLocked
        - LnProviderUpdated
        - PenaltyReserveUpdated
        - SlashRequest
        - TransferFilled
      abis:
        - name: HelixLnBridgeV3
          file: ./abis/HelixLnBridgeV3.json
      eventHandlers:
        - event: TokenLocked((uint256,address,address,address,uint112,uint112,address,uint256),bytes32,bytes32,uint112,uint112,uint64)
          handler: handleTokenLocked
        - event: LnProviderUpdated(uint256,address,address,address,uint112,uint16,uint112)
          handler: handleLnProviderUpdated
        - event: PenaltyReserveUpdated(address,address,uint256)
          handler: handlePenaltyReserveUpdated
        - event: SlashRequest(bytes32,uint256,address,address,address,address)
          handler: handleSlashRequest
        - event: TransferFilled(bytes32,address)
          handler: handleTransferFilled
        - event: LnProviderPaused(address,uint256,address,address,bool)
          handler: handleLnProviderPaused
      file: ./src/HelixLnBridgeV3.ts
" > subgraph.yaml
