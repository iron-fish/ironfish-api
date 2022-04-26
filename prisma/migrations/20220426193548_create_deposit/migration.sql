-- CreateTable
CREATE TABLE "Deposit" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_hash" VARCHAR NOT NULL,
    "block_hash" VARCHAR NOT NULL,
    "block_sequence" INTEGER NOT NULL,
    "note_index" INTEGER NOT NULL,
    "network_version" INTEGER NOT NULL,
    "main" BOOLEAN NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);
