/*
  Warnings:

  - Added the required column `lastTransferId` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetNonce` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `withdrawNonce` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lnv20RelayInfo" ADD COLUMN     "lastTransferId" TEXT NOT NULL,
ADD COLUMN     "targetNonce" BIGINT NOT NULL,
ADD COLUMN     "withdrawNonce" BIGINT NOT NULL;
