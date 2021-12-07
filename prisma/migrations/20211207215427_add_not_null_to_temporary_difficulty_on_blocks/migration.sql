/*
  Warnings:

  - Made the column `difficulty_temporary` on table `blocks` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "FK__events__block_id";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "FK__events__user_id";

-- AlterTable
ALTER TABLE "blocks" ALTER COLUMN "difficulty_temporary" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_blocks_on_hash_and_network_version" RENAME TO "blocks_hash_network_version_key";

-- RenameIndex
ALTER INDEX "uq_blocks_daily_on_date" RENAME TO "blocks_daily_date_key";

-- RenameIndex
ALTER INDEX "uq_events_on_block_id" RENAME TO "events_block_id_key";

-- RenameIndex
ALTER INDEX "uq_transactions_on_hash_and_network_version" RENAME TO "transactions_hash_network_version_key";

-- RenameIndex
ALTER INDEX "uq_users_on_confirmation_token" RENAME TO "users_confirmation_token_key";
