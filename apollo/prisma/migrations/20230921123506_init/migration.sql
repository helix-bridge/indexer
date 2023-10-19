/*
  Warnings:

  - Added the required column `cost` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `heartbeatTimestamp` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profit` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lnv20RelayInfo" ADD COLUMN     "cost" BIGINT NOT NULL,
ADD COLUMN     "heartbeatTimestamp" INTEGER NOT NULL,
ADD COLUMN     "profit" BIGINT NOT NULL;
