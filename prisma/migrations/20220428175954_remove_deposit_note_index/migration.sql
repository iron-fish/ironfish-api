/*
  Warnings:

  - You are about to drop the column `note_index` on the `deposits` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deposit_id]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `graffiti` to the `deposits` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "deposits" DROP COLUMN "note_index",
ADD COLUMN     "graffiti" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "deposit_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "uq_events_on_deposit_id" ON "events"("deposit_id");

-- CreateIndex
CREATE INDEX "index_events_on_deposit_id" ON "events"("deposit_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
