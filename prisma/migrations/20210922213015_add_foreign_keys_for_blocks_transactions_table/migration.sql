
-- AddForeignKey
ALTER TABLE "blocks_transactions" ADD CONSTRAINT "blocks_transactions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks_transactions" ADD CONSTRAINT "blocks_transactions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
