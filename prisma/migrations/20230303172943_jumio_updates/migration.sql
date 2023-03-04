/*
  Warnings:

  - You are about to drop the column `id_issuing_country` on the `redemptions` table. All the data in the column will be lost.
  - You are about to drop the column `id_subtype` on the `redemptions` table. All the data in the column will be lost.
  - You are about to drop the column `id_type` on the `redemptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "jumio_transactions" ADD COLUMN     "failure_message" VARCHAR;

-- AlterTable
ALTER TABLE "redemptions" DROP COLUMN "id_issuing_country",
DROP COLUMN "id_subtype",
DROP COLUMN "id_type",
ADD COLUMN     "failure_message" VARCHAR,
ADD COLUMN     "id_details" JSONB;
