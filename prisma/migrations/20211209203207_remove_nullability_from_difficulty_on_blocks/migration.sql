/*
  Warnings:

  - Made the column `difficulty` on table `blocks` required. This step will fail if there are existing NULL values in that column.

*/

-- AlterTable
ALTER TABLE "blocks" ALTER COLUMN "difficulty" SET NOT NULL;
