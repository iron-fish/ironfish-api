/*
  Warnings:

  - The values [MASP_TRANSFER,MASP_BURN,MASP_MINT] on the enum `event_type` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `masp_transaction_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `masp_burn_count` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_burn_last_occurred_at` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_burn_points` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_mint_count` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_mint_last_occurred_at` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_mint_points` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_transfer_count` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_transfer_last_occurred_at` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the column `masp_transfer_points` on the `user_points` table. All the data in the column will be lost.
  - You are about to drop the `masp_transaction_head` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `masp_transactions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[multi_asset_id]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "masp_transaction_id",
ADD COLUMN     "multi_asset_id" INTEGER;

-- AlterTable
ALTER TABLE "user_points" DROP COLUMN "masp_burn_count",
DROP COLUMN "masp_burn_last_occurred_at",
DROP COLUMN "masp_burn_points",
DROP COLUMN "masp_mint_count",
DROP COLUMN "masp_mint_last_occurred_at",
DROP COLUMN "masp_mint_points",
DROP COLUMN "masp_transfer_count",
DROP COLUMN "masp_transfer_last_occurred_at",
DROP COLUMN "masp_transfer_points",
ADD COLUMN     "multi_asset_burn_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "multi_asset_burn_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "multi_asset_burn_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "multi_asset_mint_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "multi_asset_mint_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "multi_asset_mint_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "multi_asset_transfer_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "multi_asset_transfer_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "multi_asset_transfer_points" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "masp_transaction_head";

-- DropTable
DROP TABLE "masp_transactions" CASCADE;

-- CreateTable
CREATE TABLE "multi_asset" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_hash" VARCHAR NOT NULL,
    "block_hash" VARCHAR NOT NULL,
    "asset_name" VARCHAR NOT NULL,
    "type" "event_type" NOT NULL,
    "block_sequence" INTEGER NOT NULL,
    "network_version" INTEGER NOT NULL,
    "main" BOOLEAN NOT NULL,

    CONSTRAINT "multi_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multi_asset_head" (
    "id" INTEGER NOT NULL,
    "block_hash" VARCHAR NOT NULL,

    CONSTRAINT "multi_asset_head_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_multi_asset_on_transaction_hash_asset_name_type" ON "multi_asset"("transaction_hash", "asset_name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_events_on_multi_asset_id" ON "events"("multi_asset_id");

-- CreateIndex
CREATE INDEX "index_events_on_multi_asset_id" ON "events"("multi_asset_id");

-- AlterEnum
BEGIN;
DELETE FROM "events" WHERE type in ('MASP_TRANSFER', 'MASP_MINT', 'MASP_BURN');
CREATE TYPE "event_type_new" AS ENUM ('BLOCK_MINED', 'BUG_CAUGHT', 'COMMUNITY_CONTRIBUTION', 'PULL_REQUEST_MERGED', 'SOCIAL_MEDIA_PROMOTION', 'NODE_UPTIME', 'SEND_TRANSACTION', 'MULTI_ASSET_TRANSFER', 'MULTI_ASSET_BURN', 'MULTI_ASSET_MINT');
ALTER TABLE "events" ALTER COLUMN "type" TYPE "event_type_new" USING ("type"::text::"event_type_new");
ALTER TABLE "multi_asset" ALTER COLUMN "type" TYPE "event_type_new" USING ("type"::text::"event_type_new");
ALTER TYPE "event_type" RENAME TO "event_type_old";
ALTER TYPE "event_type_new" RENAME TO "event_type";
DROP TYPE "event_type_old";
COMMIT;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_multi_asset_id_fkey" FOREIGN KEY ("multi_asset_id") REFERENCES "multi_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "uq_multi_asset_on_user_id_type_week" ON "events"("user_id", "type", "week") WHERE multi_asset_id IS NOT NULL;