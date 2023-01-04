/*
  Warnings:

  - You are about to drop the column `masp_transaction_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the `masp_transaction_head` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `masp_transactions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[masp_id]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_masp_transaction_id_fkey";

-- DropIndex
DROP INDEX "index_events_on_masp_transaction_id";

-- DropIndex
DROP INDEX "uq_events_on_masp_transaction_id";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "masp_transaction_id",
ADD COLUMN     "masp_id" INTEGER;

-- DropTable
DROP TABLE "masp_transaction_head";

-- DropTable
DROP TABLE "masp_transactions";

-- CreateTable
CREATE TABLE "masp" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_hash" VARCHAR NOT NULL,
    "block_hash" VARCHAR NOT NULL,
    "asset_name" VARCHAR NOT NULL,
    "type" "event_type" NOT NULL,
    "block_sequence" INTEGER NOT NULL,
    "network_version" INTEGER NOT NULL,
    "main" BOOLEAN NOT NULL,

    CONSTRAINT "masp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masp_head" (
    "id" INTEGER NOT NULL,
    "block_hash" VARCHAR NOT NULL,

    CONSTRAINT "masp_head_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_masp_on_transaction_hash_asset_name_type" ON "masp"("transaction_hash", "asset_name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_events_on_masp_id" ON "events"("masp_id");

-- CreateIndex
CREATE INDEX "index_events_on_masp_id" ON "events"("masp_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_masp_id_fkey" FOREIGN KEY ("masp_id") REFERENCES "masp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
