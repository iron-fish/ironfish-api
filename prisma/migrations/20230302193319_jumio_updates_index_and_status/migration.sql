/*
  Warnings:

  - You are about to drop the column `decision_label` on the `jumio_transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "jumio_transactions" DROP COLUMN "decision_label",
ADD COLUMN     "last_workflow_fetch" JSONB;

-- CreateIndex
CREATE INDEX "index_jumio_transactions_on_jumio_workflow_execution_id" ON "jumio_transactions"("workflow_execution_id");

-- CreateIndex
CREATE INDEX "index_redemption_jumio_account_id" ON "redemptions"("jumio_account_id");
