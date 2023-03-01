/*
  Warnings:

  - The `kyc_status` column on the `redemptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('NOT_EXECUTED', 'PASSED', 'REJECTED', 'WARNING');

-- CreateEnum
CREATE TYPE "DecisionLabel" AS ENUM ('TECHNICAL_ERROR', 'NOT_UPLOADED', 'OK', 'BAD_QUALITY', 'BLURRED1', 'BAD_QUALITY_IMAGE1', 'PART_OF_DOCUMENT_MISSING1', 'PART_OF_DOCUMENT_HIDDEN1', 'DAMAGED_DOCUMENT1', 'GLARE1', 'MISSING_MANDATORY_DATAPOINTS1', 'BLACK_WHITE', 'MISSING_PAGE', 'MISSING_SIGNATURE', 'NOT_A_DOCUMENT', 'PHOTOCOPY', 'LIVENESS_UNDETERMINED', 'UNSUPPORTED_COUNTRY', 'UNSUPPORTED_DOCUMENT_TYPE');

-- DropIndex
DROP INDEX "index_users_on_graffiti";

-- AlterTable
ALTER TABLE "redemptions" DROP COLUMN "kyc_status",
ADD COLUMN     "kyc_status" "DecisionStatus";

-- DropEnum
DROP TYPE "KycStatus";

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
