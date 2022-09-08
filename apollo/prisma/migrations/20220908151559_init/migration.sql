-- AlterTable
ALTER TABLE "HistoryRecord" ALTER COLUMN "guardSignatures" DROP NOT NULL,
ALTER COLUMN "guardSignatures" SET DATA TYPE TEXT;
