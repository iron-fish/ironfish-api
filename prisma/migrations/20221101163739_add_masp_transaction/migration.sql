/*
  Warnings:

  - A unique constraint covering the columns `[masp_transaction_id]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MaspTransactionType" AS ENUM ('TRANSFER', 'BURN', 'MINT');

-- DropIndex
DROP INDEX "index_users_on_graffiti";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "masp_transaction_id" INTEGER;

-- CreateTable
CREATE TABLE "masp_transactions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_hash" VARCHAR NOT NULL,
    "block_hash" VARCHAR NOT NULL,
    "asset_identifier" VARCHAR NOT NULL,
    "type" "MaspTransactionType" NOT NULL,
    "block_sequence" INTEGER NOT NULL,
    "network_version" INTEGER NOT NULL,
    "main" BOOLEAN NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "masp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_events_on_masp_transaction_id" ON "events"("masp_transaction_id");

-- CreateIndex
CREATE INDEX "index_users_on_graffiti" ON "users"("graffiti");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_masp_transaction_id_fkey" FOREIGN KEY ("masp_transaction_id") REFERENCES "masp_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
