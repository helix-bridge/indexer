-- CreateTable
CREATE TABLE "HistoryRecord" (
    "id" TEXT NOT NULL,
    "fromChain" TEXT NOT NULL,
    "toChain" TEXT NOT NULL,
    "bridge" TEXT NOT NULL,
    "laneId" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL,
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

-- CreateTable
CREATE TABLE "DailyStatistics" (
    "fromChain" TEXT NOT NULL,
    "toChain" TEXT NOT NULL,
    "bridge" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "dailyVolume" BIGINT,
    "dailyCount" BIGINT
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyStatistics_fromChain_toChain_timestamp_token_key" ON "DailyStatistics"("fromChain", "toChain", "timestamp", "token");
