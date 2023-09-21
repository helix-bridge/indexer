echo "specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: LnDefaultBridge
    network: $1
    source:
      address: \"$2\"
      abi: LnDefaultBridge
      startBlock: $3
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - TokenLocked
        - LnProviderUpdated
        - TransferFilled
        - Slash
        - MarginUpdated
      abis:
        - name: LnDefaultBridge
          file: ./abis/LnDefaultBridge.json
      eventHandlers:
        - event: TokenLocked(uint256,bytes32,address,address,address,uint112,uint112,uint32,address)
          handler: handleTokenLocked
        - event: TokenLocked(uint256,bytes32,address,address,address,uint112,uint112,uint64,address)
          handler: handleTokenLocked
        - event: LnProviderUpdated(uint256,address,address,address,uint112,uint8)
          handler: handleLnProviderUpdated
        - event: TransferFilled(bytes32,address)
          handler: handleTransferFilled
          receipt: true
        - event: Slash(bytes32,uint256,address,address,address,uint256,address)
          handler: handleSlash
        - event: MarginUpdated(uint256,address,address,address,uint256,uint64)
          handler: handleMarginUpdated

      file: ./src/LnDefaultBridge.ts
" > subgraph.yaml
