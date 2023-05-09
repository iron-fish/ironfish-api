/*
  Warnings:

  - You are about to drop the `deposit_head` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deposits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `jumio_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multi_asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multi_asset_head` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `node_uptimes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `redemptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_points` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/

DROP MATERIALIZED VIEW block_mined_user_ranks;
DROP MATERIALIZED VIEW bug_caught_user_ranks;
DROP MATERIALIZED VIEW community_contribution_user_ranks;
DROP MATERIALIZED VIEW pull_request_merged_user_ranks;
DROP MATERIALIZED VIEW social_media_promotion_user_ranks;
DROP MATERIALIZED VIEW node_uptime_user_ranks;
DROP MATERIALIZED VIEW send_transaction_user_ranks;
DROP MATERIALIZED VIEW multi_asset_transfer_user_ranks;
DROP MATERIALIZED VIEW multi_asset_burn_user_ranks; 
DROP MATERIALIZED VIEW multi_asset_mint_user_ranks;
DROP MATERIALIZED VIEW pool4_user_ranks;
DROP MATERIALIZED VIEW total_points_user_ranks;

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_block_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_deposit_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_multi_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_user_id_fkey";

-- DropForeignKey
ALTER TABLE "jumio_transactions" DROP CONSTRAINT "jumio_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "node_uptimes" DROP CONSTRAINT "node_uptimes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "redemptions" DROP CONSTRAINT "redemptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_points" DROP CONSTRAINT "user_points_user_id_fkey";

-- DropTable
DROP TABLE "deposit_head";

-- DropTable
DROP TABLE "deposits";

-- DropTable
DROP TABLE "events";

-- DropTable
DROP TABLE "jumio_transactions";

-- DropTable
DROP TABLE "multi_asset";

-- DropTable
DROP TABLE "multi_asset_head";

-- DropTable
DROP TABLE "node_uptimes";

-- DropTable
DROP TABLE "redemptions";

-- DropTable
DROP TABLE "user_points";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "DecisionLabel";

-- DropEnum
DROP TYPE "DecisionStatus";

-- DropEnum
DROP TYPE "KycStatus";

-- DropEnum
DROP TYPE "event_type";
