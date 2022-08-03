/*
  Warnings:

  - You are about to drop the column `amount` on the `HistoryRecord` table. All the data in the column will be lost.
  - You are about to drop the column `laneId` on the `HistoryRecord` table. All the data in the column will be lost.
  - You are about to drop the column `responseTxHash` on the `HistoryRecord` table. All the data in the column will be lost.
  - Added the required column `messageNonce` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recvAmount` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sendAmount` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" DROP COLUMN "amount",
DROP COLUMN "laneId",
DROP COLUMN "responseTxHash",
ADD COLUMN     "messageNonce" TEXT NOT NULL,
ADD COLUMN     "recvAmount" TEXT NOT NULL,
ADD COLUMN     "sendAmount" TEXT NOT NULL;
