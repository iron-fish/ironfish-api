/*
  Warnings:

  - Made the column `difficulty_temporary` on table `blocks` required. This step will fail if there are existing NULL values in that column.

*/

-- AlterTable
ALTER TABLE "blocks" ALTER COLUMN "difficulty_temporary" SET NOT NULL;
