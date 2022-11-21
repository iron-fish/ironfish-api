/*
  Warnings:

  - A unique constraint covering the columns `[asset_name,type,week,main]` on the table `masp_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `week` to the `masp_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "index_users_on_graffiti";

-- AlterTable
ALTER TABLE "masp_transactions" ADD COLUMN     "week" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uq_masp_on_asset_type_week_main" ON "masp_transactions"("asset_name", "type", "week", "main");

-- CreateIndex
CREATE INDEX "index_users_on_graffiti" ON "users"("graffiti");
