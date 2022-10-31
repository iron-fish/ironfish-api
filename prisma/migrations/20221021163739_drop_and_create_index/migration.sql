-- DropIndex
DROP INDEX "index_users_on_graffiti";

-- CreateIndex
CREATE INDEX "index_users_on_graffiti" ON "users"("graffiti");
