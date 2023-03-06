-- AlterTable
ALTER TABLE "jumio_transactions" DROP COLUMN "latest_callback_at",
ADD COLUMN     "last_callback" JSONB,
ADD COLUMN     "last_callback_at" TIMESTAMP(6);
