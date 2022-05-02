/*
  Warnings:

  - A unique constraint covering the columns `[transaction_hash,graffiti]` on the table `deposits` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "uq_deposits_on_transaction_hash_and_graffiti" ON "deposits"("transaction_hash", "graffiti");
