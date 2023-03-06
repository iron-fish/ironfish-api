-- CreateIndex
CREATE INDEX "index_faucet_transactions_on_completed_at" ON "faucet_transactions"("completed_at");

-- CreateIndex
CREATE INDEX "index_faucet_transactions_on_completed_at_and_started_at" ON "faucet_transactions"("started_at", "completed_at");
