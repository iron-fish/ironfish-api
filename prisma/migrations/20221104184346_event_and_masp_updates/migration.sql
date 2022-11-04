/*
  Warnings:

  - You are about to drop the column `amount` on the `masp_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `asset_identifier` on the `masp_transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transaction_hash]` on the table `masp_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `asset_name` to the `masp_transactions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `masp_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

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

-- DropIndex
DROP INDEX "index_users_on_graffiti";

-- AlterTable
ALTER TABLE "masp_transactions" DROP COLUMN "amount",
DROP COLUMN "asset_identifier",
ADD COLUMN     "asset_name" VARCHAR NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "event_type" NOT NULL;

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

-- CreateTable
CREATE TABLE "masp_transaction_head" (
    "id" INTEGER NOT NULL,
    "block_hash" VARCHAR NOT NULL,

    CONSTRAINT "masp_transaction_head_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_masp_on_transaction_hash" ON "masp_transactions"("transaction_hash");

-- CreateIndex
CREATE INDEX "index_users_on_graffiti" ON "users"("graffiti");
