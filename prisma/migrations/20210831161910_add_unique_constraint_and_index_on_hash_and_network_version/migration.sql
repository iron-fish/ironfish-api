/*
  Warnings:

  - A unique constraint covering the columns `[hash,network_version]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `network_version` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "network_version" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "index_transactions_on_hash_and_network_version" ON "transactions"("hash", "network_version");

-- CreateIndex
CREATE UNIQUE INDEX "uq_transactions_on_hash_and_network_version" ON "transactions"("hash", "network_version");
