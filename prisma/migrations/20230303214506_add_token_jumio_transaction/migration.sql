/*
  Warnings:

  - Added the required column `token` to the `jumio_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "jumio_transactions" ADD COLUMN     "token" VARCHAR NOT NULL;
