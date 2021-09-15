-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "FK__events__block_id";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "FK__events__user_id";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_block_id_fkey";

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks_transactions" ADD CONSTRAINT "blocks_transactions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks_transactions" ADD CONSTRAINT "blocks_transactions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_blocks_on_hash_and_network_version" RENAME TO "blocks_hash_network_version_key";

-- RenameIndex
ALTER INDEX "uq_events_on_block_id" RENAME TO "events_block_id_key";

-- RenameIndex
ALTER INDEX "uq_transactions_on_hash_and_network_version" RENAME TO "transactions_hash_network_version_key";

-- RenameIndex
ALTER INDEX "uq_users_on_confirmation_token" RENAME TO "users_confirmation_token_key";
