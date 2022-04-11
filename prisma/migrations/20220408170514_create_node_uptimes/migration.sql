-- CreateTable
CREATE TABLE "node_uptimes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_hours" INTEGER NOT NULL DEFAULT 0,
    "last_checked_in" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_uptimes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "index_node_uptime_on_user_id" ON "node_uptimes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_uptimes_user_id_key" ON "node_uptimes"("user_id");

-- AddForeignKey
ALTER TABLE "node_uptimes" ADD CONSTRAINT "node_uptimes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
