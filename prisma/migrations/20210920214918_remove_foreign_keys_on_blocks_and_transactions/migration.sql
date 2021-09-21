/*
  Warnings:

  - You are about to drop the column `block_id` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_block_id_fkey";

-- DropIndex
DROP INDEX "index_transactions_on_block_id";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "block_id";
