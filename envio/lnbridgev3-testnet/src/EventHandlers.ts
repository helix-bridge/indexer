import {
    HelixLnBridgeV3Contract,
    LnNonceOrderEntity,
    Lnv3TransferRecordEntity,
    Lnv3RelayRecordEntity,
    Lnv3RelayUpdateRecordEntity,
    Lnv3PenaltyReserveEntity
} from "generated";

const PROVIDER_UPDATE = 0;
const PAUSE_UPDATE = 1;

const lockRecordNonceId = "0x01";
const providerUpdateNonce = "0x02";

// **************** source chain start ****************
HelixLnBridgeV3Contract.TokenLocked.handlerAsync(async ({ event, context }) => {
  let counter = await context.LnNonceOrder.get(lockRecordNonceId);
  let count: bigint = BigInt(0);
  if (counter !== undefined) {
      count = counter.count + BigInt(1);
  }
  context.LnNonceOrder.set({
      id: lockRecordNonceId,
      count: count
  });

  const transferId = event.params.transferId.toString();
  context.Lnv3TransferRecord.set({
      id: transferId,
      nonce: count,
      messageNonce: event.params.params[7],
      localChainId: event.chainId,
      remoteChainId: event.params.params[0],
      provider: event.params.params[1],
      sourceToken: event.params.params[2],
      targetToken: event.params.params[3],
      sourceAmount: event.params.params[5],
      targetAmount: event.params.targetAmount,
      sender: event.txOrigin??"",
      receiver: event.params.params[6],
      timestamp: event.blockTimestamp,
      transactionHash: event.transactionHash,
      fee: event.params.fee,
      transferId: event.params.transferId,
      hasWithdrawn: false
  });
});

HelixLnBridgeV3Contract.LiquidityWithdrawn.handlerAsync(async ({ event, context }) => {
  for (let i = 0; i < event.params.transferIds.length; i++) {
    const transferId = event.params.transferIds[i];
    let existEntity = await context.Lnv3TransferRecord.get(transferId);
    if (existEntity === undefined) continue;
    let entity = context.Lnv3TransferRecord.set({
        ...existEntity,
        hasWithdrawn: true
    });
  }
});

HelixLnBridgeV3Contract.LnProviderUpdated.handlerAsync(async ({ event, context }) => {
  let counter = await context.LnNonceOrder.get(providerUpdateNonce);
  let count: bigint = BigInt(0);
  if (counter !== undefined) {
      count = counter.count + BigInt(1);
  }
  context.LnNonceOrder.set({
      id: providerUpdateNonce,
      count: count
  });

  context.Lnv3RelayUpdateRecord.set({
      id: event.transactionHash,
      nonce: count,
      localChainId: event.chainId,
      remoteChainId: event.params.remoteChainId,
      updateType: PROVIDER_UPDATE,
      provider: event.params.provider,
      sourceToken: event.params.sourceToken,
      targetToken: event.params.targetToken,
      transactionHash: event.transactionHash,
      timestamp: event.blockTimestamp,
      penalty: BigInt(0),
      baseFee: event.params.baseFee,
      transferLimit: event.params.transferLimit,
      liquidityFeeRate: event.params.liquidityfeeRate,
      paused: false,
  });
});

HelixLnBridgeV3Contract.PenaltyReserveUpdated.handlerAsync(async ({ event, context }) => {
  const provider = event.params.provider;
  const sourceToken = event.params.sourceToken;
  context.Lnv3PenaltyReserve.set({
      id: `${provider}-${sourceToken}`,
      localChainId: event.chainId,
      provider: provider,
      sourceToken: sourceToken,
      penaltyReserved: event.params.updatedPanaltyReserve
  });
});

HelixLnBridgeV3Contract.LnProviderPaused.handlerAsync(async ({ event, context }) => {
  let counter = await context.LnNonceOrder.get(providerUpdateNonce);
  let count: bigint = BigInt(0);
  if (counter !== undefined) {
      count = counter.count + BigInt(1);
  }
  context.LnNonceOrder.set({
      id: providerUpdateNonce,
      count: count
  });

  context.Lnv3RelayUpdateRecord.set({
      id: event.transactionHash,
      nonce: count,
      localChainId: event.chainId,
      remoteChainId: event.params.remoteChainId,
      updateType: PAUSE_UPDATE,
      provider: event.params.provider,
      sourceToken: event.params.sourceToken,
      targetToken: event.params.targetToken,
      transactionHash: event.transactionHash,
      timestamp: event.blockTimestamp,
      penalty: BigInt(0),
      baseFee: BigInt(0),
      transferLimit: BigInt(0),
      liquidityFeeRate: BigInt(0),
      paused: event.params.paused,
  });
});
// **************** source chain end ****************

// **************** target chain start ****************
HelixLnBridgeV3Contract.TransferFilled.handlerAsync(async ({ event, context }) => {
  context.Lnv3RelayRecord.set({
      id: event.params.transferId,
      localChainId: event.chainId,
      timestamp: event.blockTimestamp,
      relayer: event.params.provider,
      transactionHash: event.transactionHash,
      slashed: false,
      //fee: event.receipt!.gasUsed * event.transaction.gasPrice,
      // todo
      fee: BigInt(0),
      requestWithdrawTimestamp: 0
  });
});

HelixLnBridgeV3Contract.SlashRequest.handlerAsync(async ({ event, context }) => {
  context.Lnv3RelayRecord.set({
      id: event.params.transferId,
      localChainId: event.chainId,
      timestamp: event.blockTimestamp,
      relayer: event.params.provider,
      transactionHash: event.transactionHash,
      slashed: true,
      fee: BigInt(0),
      requestWithdrawTimestamp: 0
  });
});

HelixLnBridgeV3Contract.LiquidityWithdrawRequested.handlerAsync(async ({ event, context }) => {
  for (let i = 0; i < event.params.transferIds.length; i++) {
    const transferId = event.params.transferIds[i];
    const existEntity = await context.Lnv3RelayRecord.get(transferId);
    if (existEntity === undefined) continue;
    context.Lnv3RelayRecord.set({
        ...existEntity,
        requestWithdrawTimestamp: event.blockTimestamp
    });
  }
});
// **************** target chain end ******************

