/*
  Warnings:

  - The values [NOT_STARTED,PASS,PENDING,FAIL_TRANSACTION,FAIL_MAX_ATTEMPTS] on the enum `KycStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('NOT_EXECUTED', 'PASSED', 'REJECTED', 'WARNING');

-- CreateEnum
CREATE TYPE "DecisionLabel" AS ENUM ('TECHNICAL_ERROR', 'NOT_UPLOADED', 'OK', 'BAD_QUALITY', 'BLURRED1', 'BAD_QUALITY_IMAGE1', 'PART_OF_DOCUMENT_MISSING1', 'PART_OF_DOCUMENT_HIDDEN1', 'DAMAGED_DOCUMENT1', 'GLARE1', 'MISSING_MANDATORY_DATAPOINTS1', 'BLACK_WHITE', 'MISSING_PAGE', 'MISSING_SIGNATURE', 'NOT_A_DOCUMENT', 'PHOTOCOPY', 'LIVENESS_UNDETERMINED', 'UNSUPPORTED_COUNTRY', 'UNSUPPORTED_DOCUMENT_TYPE');

-- AlterEnum
BEGIN;
CREATE TYPE "KycStatus_new" AS ENUM ('IN_PROGRESS', 'TRY_AGAIN', 'FAILED', 'SUBMITTED', 'SUCCESS');
ALTER TABLE "redemptions" ALTER COLUMN "kyc_status" TYPE "KycStatus_new" USING ("kyc_status"::text::"KycStatus_new");
ALTER TYPE "KycStatus" RENAME TO "KycStatus_old";
ALTER TYPE "KycStatus_new" RENAME TO "KycStatus";
DROP TYPE "KycStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "index_users_on_graffiti";

-- CreateTable
CREATE TABLE "jumio_transactions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "decision_status" "DecisionStatus" NOT NULL,
    "decision_label" "DecisionLabel" NOT NULL,
    "workflow_execution_id" VARCHAR NOT NULL,
    "web_href" VARCHAR NOT NULL,

    CONSTRAINT "jumio_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "index_jumio_transactions_on_user_id" ON "jumio_transactions"("user_id");

-- CreateIndex
CREATE INDEX "index_users_on_graffiti" ON "users"("graffiti");

-- AddForeignKey
ALTER TABLE "jumio_transactions" ADD CONSTRAINT "jumio_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
