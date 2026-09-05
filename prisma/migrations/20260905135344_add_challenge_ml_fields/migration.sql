-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "extraction" JSONB,
ADD COLUMN     "mlConfidence" DOUBLE PRECISION;
