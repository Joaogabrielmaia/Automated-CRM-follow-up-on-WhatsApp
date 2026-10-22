-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'DONE';

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "minGapMinutes" INTEGER NOT NULL DEFAULT 720;
