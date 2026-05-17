-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ALTER COLUMN "target" DROP NOT NULL;
