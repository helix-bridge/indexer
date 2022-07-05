/*
  Warnings:

  - You are about to drop the column `bridgeDispatchMethod` on the `HistoryRecord` table. All the data in the column will be lost.
  - Added the required column `bridgeDispatchError` to the `HistoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HistoryRecord" DROP COLUMN "bridgeDispatchMethod",
ADD COLUMN     "bridgeDispatchError" TEXT NOT NULL;
