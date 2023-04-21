/*
  Warnings:

  - You are about to drop the column `average_difficulty_millis` on the `blocks_daily` table. All the data in the column will be lost.
  - Added the required column `average_difficulty` to the `blocks_daily` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "blocks_daily" DROP COLUMN "average_difficulty_millis",
ADD COLUMN     "average_difficulty" DECIMAL(65,30) NOT NULL;
