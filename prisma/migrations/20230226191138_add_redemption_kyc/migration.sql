-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PASS', 'PENDING', 'FAIL_TRANSACTION', 'FAIL_MAX_ATTEMPTS');

-- CreateTable
CREATE TABLE "redemptions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "kyc_attempts" INTEGER NOT NULL DEFAULT 0,
    "kyc_status" "KycStatus" NOT NULL,
    "jumio_account_id" VARCHAR,
    "public_address" VARCHAR NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_user_id_key" ON "redemptions"("user_id");

-- CreateIndex
CREATE INDEX "index_redemption_on_user_id" ON "redemptions"("user_id");

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
