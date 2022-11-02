-- AlterTable
ALTER TABLE "user_points" ADD COLUMN     "block_mined_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bug_caught_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "community_contribution_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "node_uptime_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pull_request_merged_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "send_transaction_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "social_media_promotion_count" INTEGER NOT NULL DEFAULT 0;
