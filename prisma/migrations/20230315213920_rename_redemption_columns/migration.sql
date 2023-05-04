/*
  Warnings:

  - You are about to drop the column `pool1_ore` on the `redemptions` table. All the data in the column will be lost.
  - You are about to drop the column `pool2_ore` on the `redemptions` table. All the data in the column will be lost.
  - You are about to drop the column `pool3_ore` on the `redemptions` table. All the data in the column will be lost.
  - You are about to drop the column `pool4_ore` on the `redemptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "redemptions" DROP COLUMN "pool1_ore",
DROP COLUMN "pool2_ore",
DROP COLUMN "pool3_ore",
DROP COLUMN "pool4_ore",
ADD COLUMN     "pool_one" BIGINT,
ADD COLUMN     "pool_two" BIGINT,
ADD COLUMN     "pool_three" BIGINT,
ADD COLUMN     "pool_four" BIGINT;
