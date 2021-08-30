-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" VARCHAR NOT NULL,
    "fee" BIGINT NOT NULL,
    "size" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL,
    "block_id" INTEGER NOT NULL,
    "notes" JSONB NOT NULL,
    "spends" JSONB NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "index_transactions_on_block_id" ON "transactions"("block_id");

-- CreateIndex
CREATE INDEX "index_transactions_on_hash" ON "transactions"("hash");

-- AddForeignKey
ALTER TABLE "transactions" ADD FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
