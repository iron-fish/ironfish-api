-- CreateTable
CREATE TABLE "EthBridgeAddresses" (
    "id" SERIAL NOT NULL,
    "address" VARCHAR NOT NULL,

    CONSTRAINT "EthBridgeAddresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EthBridgeHead" (
    "hash" VARCHAR NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EthBridgeAddresses_address_key" ON "EthBridgeAddresses"("address");

-- CreateIndex
CREATE UNIQUE INDEX "EthBridgeHead_hash_key" ON "EthBridgeHead"("hash");
