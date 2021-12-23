-- DropIndex
DROP INDEX "index_users_on_confirmation_token";

-- DropIndex
DROP INDEX "uq_users_on_confirmation_token";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "confirmation_token",
DROP COLUMN "confirmed_at";
