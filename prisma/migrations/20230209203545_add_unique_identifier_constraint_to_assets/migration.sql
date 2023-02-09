/*
  Warnings:

  - A unique constraint covering the columns `[identifier]` on the table `assets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "uq_assets_on_identifier" ON "assets"("identifier");
