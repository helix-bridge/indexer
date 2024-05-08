import { ponder } from "@/generated";

const lockRecordNonceId = "0x01";
const providerUpdateNonce = "0x02";

const PROVIDER_UPDATE = 0;
const PAUSE_UPDATE = 1;

ponder.on("HelixLnBridgeV3:TransferFilled", async ({ event, context }) => {
  const id = `${context.network.chainId}-${event.args.transferId}`;
  const { Lnv3RelayRecord } = context.db;
  await Lnv3RelayRecord.create({
    id: id,
    data: {
      timestamp: event.block.timestamp,
      localChainId: BigInt(context.network.chainId),
      relayer: event.args.provider,
      transactionHash: event.transaction.hash,
      slashed: false,
      // TODO: can't get the tx fee
      fee: BigInt(0),
    }
  });
});

ponder.on("HelixLnBridgeV3:SlashRequest", async ({ event, context }) => {
  const { Lnv3RelayRecord } = context.db;
  const id = `${context.network.chainId}-${event.args.transferId}`;
  await Lnv3RelayRecord.create({
    id: id,
    data: {
      timestamp: event.block.timestamp,
      localChainId: BigInt(context.network.chainId),
      relayer: event.args.provider,
      transactionHash: event.transaction.hash,
      slashed: true,
    }
  });
});

ponder.on(
  "HelixLnBridgeV3:LiquidityWithdrawRequested",
  async ({ event, context }) => {
    const { Lnv3RelayRecord } = context.db;
    for (let i = 0; i < event.args.transferIds.length; i++) {
      const transferId = event.args.transferIds[i];
      const id = `${context.network.chainId}-${transferId}`;
      await Lnv3RelayRecord.update({
          id: id,
          data: {
              requestWithdrawTimestamp: event.block.timestamp,
          }
      });
    }
  },
);

ponder.on("HelixLnBridgeV3:LiquidityWithdrawn", async ({ event, context }) => {
  const { Lnv3TransferRecord } = context.db;
  for (let i = 0; i < event.args.transferIds.length; i++) {
    const transferId = event.args.transferIds[i];
    const id = `${context.network.chainId}-${transferId}`;
    await Lnv3TransferRecord.update({
        id: id,
        data: {
            hasWithdrawn: true,
        }
    });
  }
});

ponder.on("HelixLnBridgeV3:TokenLocked", async ({ event, context }) => {
  const { LnNonceOrder, Lnv3TransferRecord } = context.db;
  const counterId = `${context.network.chainId}-${lockRecordNonceId}`;
  let counter = await LnNonceOrder.findUnique({
    id: counterId,
  });
  if (counter === null) {
      counter = await LnNonceOrder.create({
          id: counterId,
          data: {
              count: BigInt(0),
          }
      });
  }

  const count = counter.count + BigInt(1);
  await LnNonceOrder.update({
      id: counterId,
      data: {
          count: count,
      }
  });

  const id = `${context.network.chainId}-${event.args.transferId}`;
  await Lnv3TransferRecord.create({
      id: id,
      data: {
          nonce: count,
          messageNonce: event.args.params.timestamp,
          localChainId: BigInt(context.network.chainId),
          remoteChainId: event.args.params.remoteChainId,
          provider: event.args.params.provider,
          sourceToken: event.args.params.sourceToken,
          targetToken: event.args.params.targetToken,
          sourceAmount: event.args.params.amount,
          targetAmount: event.args.targetAmount,
          sender: event.transaction.from,
          receiver: event.args.params.receiver,
          timestamp: event.block.timestamp,
          transactionHash: event.transaction.hash,
          fee: event.args.fee,
          transferId: event.args.transferId,
      }
  });
});

ponder.on("HelixLnBridgeV3:LnProviderUpdated", async ({ event, context }) => {
  const { LnNonceOrder, Lnv3RelayUpdateRecord } = context.db;
  const counterId = `${context.network.chainId}-${providerUpdateNonce}`;
  let counter = await LnNonceOrder.findUnique({
    id: counterId,
  });
  if (counter === null) {
      counter = await LnNonceOrder.create({
          id: counterId,
          data: {
              count: BigInt(0),
          }
      });
  }

  const count = counter.count + BigInt(1);
  await LnNonceOrder.update({
      id: counterId,
      data: {
          count: count,
      }
  });
  const id = `${context.network.chainId}-${event.transaction.hash}`;
  await Lnv3RelayUpdateRecord.create({
      id: id,
      data: {
          localChainId: BigInt(context.network.chainId),
          remoteChainId: event.args.remoteChainId,
          nonce: count,
          updateType: PROVIDER_UPDATE,
          provider: event.args.provider,
          sourceToken: event.args.sourceToken,
          targetToken: event.args.targetToken,
          transactionHash: event.transaction.hash,
          timestamp: event.block.timestamp,
          baseFee: event.args.baseFee,
          liquidityFeeRate: event.args.liquidityfeeRate,
          transferLimit: event.args.transferLimit,
      },
  });
});

ponder.on("HelixLnBridgeV3:PenaltyReserveUpdated", async ({ event, context }) => {
  const { Lnv3PenaltyReserve } = context.db;
  const provider = event.args.provider;
  const sourceToken = event.args.sourceToken;
  let id = `${context.network.chainId}-${provider}-${sourceToken}`;

  await Lnv3PenaltyReserve.upsert({
      id: id,
      create: {
          localChainId: BigInt(context.network.chainId),
          provider: provider,
          sourceToken: sourceToken,
          penaltyReserved: event.args.updatedPanaltyReserve,
      },
      update: {
          penaltyReserved: event.args.updatedPanaltyReserve,
      }
  });
});

ponder.on("HelixLnBridgeV3:LnProviderPaused", async ({ event, context }) => {
  const { LnNonceOrder, Lnv3RelayUpdateRecord } = context.db;
  const counterId = `${context.network.chainId}-${providerUpdateNonce}`;
  let counter = await LnNonceOrder.findUnique({
    id: counterId,
  });
  if (counter === null) {
      counter = await LnNonceOrder.create({
          id: counterId,
          data: {
              count: BigInt(0),
          }
      });
  }

  const count = counter.count + BigInt(1);
  await LnNonceOrder.update({
      id: counterId,
      data: {
          count: count,
      }
  });

  const id = `${context.network.chainId}-${event.transaction.hash}`;
  await Lnv3RelayUpdateRecord.create({
      id: id,
      data: {
          localChainId: BigInt(context.network.chainId),
          remoteChainId: event.args.remoteChainId,
          nonce: count,
          updateType: PAUSE_UPDATE,
          provider: event.args.provider,
          sourceToken: event.args.sourceToken,
          targetToken: event.args.targetToken,
          transactionHash: event.transaction.hash,
          timestamp: event.block.timestamp,
          paused: event.args.paused,
      }
  });
});

