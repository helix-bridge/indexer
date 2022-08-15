/*
  Warnings:

  - You are about to drop the column `token` on the `HistoryRecord` table. All the data in the column will be lost.
  - Added the required column `recvToken` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sendToken` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" DROP COLUMN "token",
ADD COLUMN     "recvToken" TEXT NOT NULL,
ADD COLUMN     "sendToken" TEXT NOT NULL;
