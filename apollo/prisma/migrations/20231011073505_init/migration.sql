/*
  Warnings:

  - Added the required column `protocolFee` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lnv20RelayInfo" ADD COLUMN     "protocolFee" TEXT NOT NULL;
