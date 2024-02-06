-- CreateTable
CREATE TABLE "LnBridgeRelayInfo" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL,
    "targetNonce" BIGINT NOT NULL,
    "fromChain" TEXT NOT NULL,
    "toChain" TEXT NOT NULL,
    "bridge" TEXT NOT NULL,
    "relayer" TEXT NOT NULL,
    "sendToken" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "margin" TEXT NOT NULL,
    "protocolFee" TEXT NOT NULL,
    "baseFee" TEXT NOT NULL,
    "liquidityFeeRate" INTEGER NOT NULL,
    "slashCount" INTEGER NOT NULL,
    "withdrawNonce" BIGINT NOT NULL,
    "lastTransferId" TEXT NOT NULL,
    "cost" TEXT NOT NULL,
    "profit" TEXT NOT NULL,
    "heartbeatTimestamp" INTEGER NOT NULL,
    "messageChannel" TEXT NOT NULL,
    "transferLimit" TEXT NOT NULL,
    "paused" BOOLEAN NOT NULL,

    CONSTRAINT "LnBridgeRelayInfo_pkey" PRIMARY KEY ("id")
);
