-- CreateTable
CREATE TABLE "EthBridgeAddresses" (
    "id" SERIAL NOT NULL,
    "address" VARCHAR NOT NULL,

    CONSTRAINT "EthBridgeAddresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EthBridgeAddresses_address_key" ON "EthBridgeAddresses"("address");
