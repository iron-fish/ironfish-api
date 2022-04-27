-- AlterTable
ALTER TABLE "user_points" ADD COLUMN     "send_transaction_last_occurred_at" TIMESTAMP(6),
ADD COLUMN     "send_transaction_points" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "index_user_points_on_node_uptime" ON "user_points"("node_uptime_points");

-- CreateIndex
CREATE INDEX "index_user_points_on_send_transaction" ON "user_points"("send_transaction_points");
