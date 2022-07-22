/*
  Warnings:

  - You are about to drop the column `bridgeDispatchError` on the `HistoryRecord` table. All the data in the column will be lost.
  - Added the required column `reason` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" DROP COLUMN "bridgeDispatchError",
ADD COLUMN     "reason" TEXT NOT NULL;
