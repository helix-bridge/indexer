/*
  Warnings:

  - Added the required column `bridgeDispatchMethod` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetTxHash` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" ADD COLUMN     "bridgeDispatchMethod" TEXT NOT NULL,
ADD COLUMN     "targetTxHash" TEXT NOT NULL;
