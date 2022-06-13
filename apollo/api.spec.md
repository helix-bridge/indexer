# API SPEC

## Naming style

camelCase

## Generic field

| field name     |  type  | demo                     | comment                   |
| :------------- | :----: | :----------------------- | :------------------------ |
| startTime      | string | unix timestamp           |                           |
| endTime        | string | unix timestamp           |                           |
| timestamp      | string | unix timestamp           |                           |
| txHash         | string | hex string               |                           |
| requestTxHash  | string | hex string               |                           |
| responseTxHash | string | hex string               |                           |
| fromChain      | string | crab; DVM mode: crab-dvm | Add '-dvm' if a dvm chain |
| toChain        | string | darwinia                 | Add '-dvm' if a dvm chain |
