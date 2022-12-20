/*
  Warnings:

  - A unique constraint covering the columns `[user_id,type,week]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateIndex
CREATE UNIQUE INDEX "uq_masp_on_user_id_type_week" ON "events"("user_id", "type", "week") WHERE masp_id IS NOT NULL;