/*
  Warnings:

  - Added the required column `softTransferLimit` to the `LnBridgeRelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LnBridgeRelayInfo" ADD COLUMN     "softTransferLimit" TEXT NOT NULL;
