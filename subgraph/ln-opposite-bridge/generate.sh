echo "specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: LnOppositeBridge
    network: $1
    source:
      address: \"$2\"
      abi: LnOppositeBridge
      startBlock: $3
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - TokenLocked
        - TransferFilled
        - LiquidityWithdrawn
        - Slash
        - LnProviderUpdated
      abis:
        - name: LnOppositeBridge
          file: ./abis/LnOppositeBridge.json
      eventHandlers:
        - event: TransferFilled(bytes32,address)
          handler: handleTransferFilled
          receipt: true
        - event: TokenLocked(uint256,bytes32,address,address,address,uint112,uint112,uint32,address)
          handler: handleTokenLocked
        - event: LiquidityWithdrawn(uint256,address,address,address,uint112)
          handler: handleLiquidityWithdrawn
        - event: Slash(uint256,bytes32,address,address,address,uint112,address)
          handler: handleSlash
        - event: LnProviderUpdated(uint256,address,address,address,uint112,uint112,uint16)
          handler: handleLnProviderUpdated
      file: ./src/LnOppositeBridge.ts
" > subgraph.yaml
