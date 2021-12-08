/*
  Warnings:

  - Added the required column `difficulty` to the `blocks` table without a default value. This is not possible if the table is not empty.

*/

-- AlterTable
ALTER TABLE "blocks" ADD COLUMN     "difficulty" BIGINT NOT NULL;
