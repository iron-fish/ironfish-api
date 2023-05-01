/*
  Warnings:

  - Made the column `previous_block_hash` on table `blocks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "blocks" ALTER COLUMN "previous_block_hash" SET NOT NULL;
