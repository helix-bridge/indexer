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
