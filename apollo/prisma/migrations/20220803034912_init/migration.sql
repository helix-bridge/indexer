/*
  Warnings:

  - You are about to drop the column `targetTxHash` on the `HistoryRecord` table. All the data in the column will be lost.
  - Added the required column `responseTxHash` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" DROP COLUMN "targetTxHash",
ADD COLUMN     "responseTxHash" TEXT NOT NULL;
