/*
  Warnings:

  - You are about to alter the column `fee` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "fee" SET DATA TYPE INTEGER;
