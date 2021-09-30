-- CreateTable
CREATE TABLE "faucet_transactions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" VARCHAR,
    "public_key" VARCHAR NOT NULL,
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "faucet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "index_faucet_transactions_on_email" ON "faucet_transactions"("email");

-- CreateIndex
CREATE INDEX "index_faucet_transactions_on_public_key" ON "faucet_transactions"("public_key");
