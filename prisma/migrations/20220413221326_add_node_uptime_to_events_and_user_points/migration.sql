-- AlterEnum
ALTER TYPE "event_type" ADD VALUE 'NODE_UPTIME';

-- AlterTable
ALTER TABLE "user_points" ADD COLUMN     "node_uptime_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "node_uptime_points" INTEGER NOT NULL DEFAULT 0;
