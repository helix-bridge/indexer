-- CreateTable
CREATE TABLE "HistoryRecord" (
    "id" TEXT NOT NULL,
    "fromChain" TEXT NOT NULL,
    "toChain" TEXT NOT NULL,
    "bridge" TEXT NOT NULL,
    "laneId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "requestTxHash" TEXT NOT NULL,
    "responseTxHash" TEXT,
    "sender" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER,
    "result" INTEGER NOT NULL,
    "fee" TEXT NOT NULL,

    CONSTRAINT "HistoryRecord_pkey" PRIMARY KEY ("id")
);
