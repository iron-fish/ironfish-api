/*
  Warnings:

  - You are about to drop the column `difficulty_temporary` on the `blocks` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "blocks" DROP COLUMN "difficulty_temporary";
