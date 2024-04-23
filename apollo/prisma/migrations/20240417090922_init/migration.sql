-- AlterTable
ALTER TABLE "LnBridgeRelayInfo" ADD COLUMN     "dynamicFee" TEXT,
ADD COLUMN     "dynamicFeeExpire" TEXT,
ADD COLUMN     "dynamicFeeSignature" TEXT;
