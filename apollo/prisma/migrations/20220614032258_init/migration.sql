/*
  Warnings:

  - Added the required column `feeToken` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" ADD COLUMN     "feeToken" TEXT NOT NULL;
