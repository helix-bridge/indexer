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
        - event: TokenLocked(bytes32,uint256,uint256,address,address,address,address,uint256,uint256,bytes)
          handler: handleTokenLocked
          receipt: true
        - event: RemoteIssuingFailure(bytes32,address,address,uint256,uint256)
          handler: handleRemoteIssuingFailure
          receipt: true
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
        - BurnAndXUnlocked
        - RollbackLockAndXIssueRequested
      abis:
        - name: xTokenIssuing
          file: ./abis/xTokenIssuing.json
      eventHandlers:
        - event: BurnAndXUnlocked(bytes32,uint256,uint256,address,address,address,uint256,uint256,bytes)
          handler: handleBurnAndXUnlocked
          receipt: true
        - event: RollbackLockAndXIssueRequested(bytes32,address,address,uint256,uint256)
          handler: handleRollbackLockAndXIssueRequested
          receipt: true
      file: ./src/xTokenIssuing.ts" >> subgraph.yaml
}

if [ $1 == 'init' ]; then
    init
elif [ $1 == 'backing' ]; then
    backing $2 $3 $4
elif [ $1 == 'issuing' ]; then
    issuing $2 $3 $4
fi
