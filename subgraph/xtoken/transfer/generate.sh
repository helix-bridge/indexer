function init() {
  echo "specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:" > subgraph.yaml
}

function backing() {
echo "  - kind: ethereum/contract
    name: xTokenBacking
    network: $1
    source:
      address: \"$2\"
      abi: xTokenBacking
      startBlock: $3
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - TokenLocked
        - RemoteIssuingFailure
      abis:
        - name: xTokenBacking
          file: ./abis/xTokenBacking.json
      eventHandlers:
        - event: TokenLocked(bytes32,uint256,address,address,address,uint256,uint256)
          handler: handleTokenLocked
        - event: RemoteIssuingFailure(bytes32,bytes32,address,address,uint256,uint256)
          handler: handleRemoteIssuingFailure
      file: ./src/xTokenBacking.ts" >> subgraph.yaml
}

function issuing() {
echo "  - kind: ethereum/contract
    name: xTokenIssuing
    network: $1
    source:
      address: \"$2\"
      abi: xTokenIssuing
      startBlock: $3
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - BurnAndRemoteUnlocked
        - RemoteUnlockForIssuingFailureRequested
      abis:
        - name: xTokenIssuing
          file: ./abis/xTokenIssuing.json
      eventHandlers:
        - event: BurnAndRemoteUnlocked(bytes32,uint256,address,address,address,address,uint256,uint256)
          handler: handleBurnAndRemoteUnlocked
        - event: RemoteUnlockForIssuingFailureRequested(bytes32,bytes32,address,address,uint256,uint256)
          handler: handleRemoteUnlockForIssuingFailureRequested
      file: ./src/xTokenIssuing.ts" >> subgraph.yaml
}

if [ $1 == 'init' ]; then
    init
elif [ $1 == 'backing' ]; then
    backing $2 $3 $4
elif [ $1 == 'issuing' ]; then
    issuing $2 $3 $4
fi
