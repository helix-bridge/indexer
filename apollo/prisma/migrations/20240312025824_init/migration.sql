/*
  Warnings:

  - Added the required column `tokenKey` to the `LnBridgeRelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LnBridgeRelayInfo" ADD COLUMN     "tokenKey" TEXT NOT NULL;
