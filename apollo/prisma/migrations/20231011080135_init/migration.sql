/*
  Warnings:

  - Added the required column `messageChannel` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lnv20RelayInfo" ADD COLUMN     "messageChannel" TEXT NOT NULL;
