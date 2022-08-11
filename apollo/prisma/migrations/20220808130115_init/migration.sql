/*
  Warnings:

  - A unique constraint covering the columns `[fromChain,toChain,bridge,timestamp,token]` on the table `DailyStatistics` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DailyStatistics_fromChain_toChain_timestamp_token_key";

-- CreateIndex
CREATE UNIQUE INDEX "DailyStatistics_fromChain_toChain_bridge_timestamp_token_key" ON "DailyStatistics"("fromChain", "toChain", "bridge", "timestamp", "token");
