-- AlterTable
ALTER TABLE "HistoryRecord" ADD COLUMN     "lastRequestWithdraw" BIGINT,
ADD COLUMN     "needWithdrawLiquidity" BOOLEAN;
