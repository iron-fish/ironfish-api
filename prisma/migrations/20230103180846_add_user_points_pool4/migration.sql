-- AlterEnum
ALTER TYPE "event_type" ADD VALUE 'POOL4';

-- AlterTable
ALTER TABLE "user_points" ADD COLUMN     "pool4_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pool4_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "pool4_points" INTEGER NOT NULL DEFAULT 0;
