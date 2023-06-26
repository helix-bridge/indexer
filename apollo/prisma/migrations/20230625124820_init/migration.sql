/*
  Warnings:

  - Added the required column `lastBlockHash` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerKey` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" ADD COLUMN     "lastBlockHash" TEXT NOT NULL,
ADD COLUMN     "providerKey" BIGINT NOT NULL;
