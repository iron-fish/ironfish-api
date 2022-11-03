/*
  Warnings:

  - You are about to drop the column `type` on the `masp_transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transaction_hash,graffiti]` on the table `masp_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `graffiti` to the `masp_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "event_type" ADD VALUE 'MASP_TRANSFER';
ALTER TYPE "event_type" ADD VALUE 'MASP_BURN';
ALTER TYPE "event_type" ADD VALUE 'MASP_MINT';

-- AlterTable
ALTER TABLE "masp_transactions" DROP COLUMN "type",
ADD COLUMN     "graffiti" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "user_points" ADD COLUMN     "masp_burn_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "masp_burn_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "masp_burn_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "masp_mint_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "masp_mint_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "masp_mint_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "masp_transfer_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "masp_transfer_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "masp_transfer_points" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "MaspTransactionType";

-- CreateIndex
CREATE UNIQUE INDEX "uq_masp_on_transaction_hash_graffiti" ON "masp_transactions"("transaction_hash", "graffiti");
