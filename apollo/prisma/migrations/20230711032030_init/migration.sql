/*
  Warnings:

  - You are about to drop the column `lastBlockHash` on the `HistoryRecord` table. All the data in the column will be lost.
  - You are about to drop the column `providerKey` on the `HistoryRecord` table. All the data in the column will be lost.
  - You are about to drop the column `providerKey` on the `Lnv20RelayInfo` table. All the data in the column will be lost.
  - Added the required column `sendToken` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" DROP COLUMN "lastBlockHash",
DROP COLUMN "providerKey";

-- AlterTable
ALTER TABLE "Lnv20RelayInfo" DROP COLUMN "providerKey",
ADD COLUMN     "sendToken" TEXT NOT NULL;
