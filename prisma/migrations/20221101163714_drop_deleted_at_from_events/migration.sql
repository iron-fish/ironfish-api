/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "deleted_at";
