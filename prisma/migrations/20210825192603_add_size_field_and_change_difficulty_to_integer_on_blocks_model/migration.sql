/*
  Warnings:

  - Added the required column `size` to the `blocks` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `difficulty` on the `blocks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "blocks" ADD COLUMN     "size" INTEGER NOT NULL,
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" INTEGER NOT NULL;
