-- CreateTable
CREATE TABLE "JumioCallback" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jumio_transaction_id" INTEGER,
    "request" JSONB NOT NULL,

    CONSTRAINT "JumioCallback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JumioCallback_jumio_transaction_id_key" ON "JumioCallback"("jumio_transaction_id");

-- AddForeignKey
ALTER TABLE "JumioCallback" ADD CONSTRAINT "JumioCallback_jumio_transaction_id_fkey" FOREIGN KEY ("jumio_transaction_id") REFERENCES "jumio_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
