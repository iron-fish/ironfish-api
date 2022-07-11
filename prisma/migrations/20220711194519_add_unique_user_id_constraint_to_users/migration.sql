-- DropIndex
DROP INDEX "index_node_uptime_on_user_id";

-- DropIndex
DROP INDEX "index_users_on_graffiti";

-- CreateIndex
CREATE INDEX "index_users_on_graffiti" ON "users"("graffiti");

-- RenameIndex
ALTER INDEX "node_uptimes_user_id_key" RENAME TO "uq_node_uptimes_on_user_id";
