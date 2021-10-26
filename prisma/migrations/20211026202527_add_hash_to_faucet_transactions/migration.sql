-- AlterTable
ALTER TABLE "faucet_transactions" ADD COLUMN     "hash" VARCHAR;

-- CreateIndex
CREATE INDEX "index_faucet_transactions_on_hash" ON "faucet_transactions"("hash");
