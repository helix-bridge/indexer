/*
  Warnings:

  - You are about to drop the column `refundCount` on the `Lnv20RelayInfo` table. All the data in the column will be lost.
  - Added the required column `slashCount` to the `Lnv20RelayInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lnv20RelayInfo" DROP COLUMN "refundCount",
ADD COLUMN     "slashCount" INTEGER NOT NULL;
