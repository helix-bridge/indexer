-- CreateTable
CREATE TABLE "Lnv20RelayInfo" (
    "id" TEXT NOT NULL,
    "fromChain" TEXT NOT NULL,
    "toChain" TEXT NOT NULL,
    "bridge" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL,
    "relayer" TEXT NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "providerKey" TEXT NOT NULL,
    "margin" TEXT NOT NULL,
    "baseFee" TEXT NOT NULL,
    "liquidityFeeRate" INTEGER NOT NULL,
    "refundCount" INTEGER NOT NULL,

    CONSTRAINT "Lnv20RelayInfo_pkey" PRIMARY KEY ("id")
);
