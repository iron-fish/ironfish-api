-- CreateTable
CREATE TABLE "blocks_transactions" (
    "block_id" INTEGER NOT NULL,
    "transaction_id" INTEGER NOT NULL,

    CONSTRAINT "blocks_transactions_pkey" PRIMARY KEY ("block_id","transaction_id")
);

-- CreateIndex
CREATE INDEX "index_blocks_transactions_on_block_id" ON "blocks_transactions"("block_id");

-- CreateIndex
CREATE INDEX "index_blocks_transactions_on_transaction_id" ON "blocks_transactions"("transaction_id");
