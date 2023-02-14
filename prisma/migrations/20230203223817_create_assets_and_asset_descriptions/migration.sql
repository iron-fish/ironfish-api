-- CreateEnum
CREATE TYPE "asset_description_type" AS ENUM ('BURN', 'MINT');

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_transaction_id" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "supply" BIGINT NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_descriptions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "asset_description_type" NOT NULL,
    "value" BIGINT NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "transaction_id" INTEGER NOT NULL,

    CONSTRAINT "asset_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "index_assets_on_created_transaction_id" ON "assets"("created_transaction_id");

-- CreateIndex
CREATE INDEX "index_asset_descriptions_on_asset_id" ON "asset_descriptions"("asset_id");

-- CreateIndex
CREATE INDEX "index_asset_descriptions_on_transaction_id" ON "asset_descriptions"("transaction_id");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_transaction_id_fkey" FOREIGN KEY ("created_transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_descriptions" ADD CONSTRAINT "asset_descriptions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_descriptions" ADD CONSTRAINT "asset_descriptions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
