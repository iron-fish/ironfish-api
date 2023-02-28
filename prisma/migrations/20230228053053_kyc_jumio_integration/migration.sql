
-- CreateTable
CREATE TABLE "jumio_transactions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "workflow_execution_id" VARCHAR NOT NULL,
    "web_href" VARCHAR NOT NULL,

    CONSTRAINT "jumio_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jumio_transactions_user_id_key" ON "jumio_transactions"("user_id");

-- CreateIndex
CREATE INDEX "index_jumio_transactions_on_user_id" ON "jumio_transactions"("user_id");

-- AddForeignKey
ALTER TABLE "jumio_transactions" ADD CONSTRAINT "jumio_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
