/*
  Warnings:

  - Made the column `searchable_text` on table `blocks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "blocks" ALTER COLUMN "searchable_text" SET NOT NULL;
