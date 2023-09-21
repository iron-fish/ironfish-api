-- CreateEnum
CREATE TYPE "bridge_request_type" AS ENUM ('IRONFISH_TO_ETH', 'ETH_TO_IRONFISH');

-- CreateEnum
CREATE TYPE "bridge_request_status" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "BridgeRequest" (
    "id" SERIAL NOT NULL,
    "address" VARCHAR NOT NULL,
    "asset" TEXT NOT NULL,
    "transaction" TEXT NOT NULL,
    "type" "bridge_request_type" NOT NULL,
    "status" "bridge_request_status" NOT NULL,

    CONSTRAINT "BridgeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeHead" (
    "hash" VARCHAR NOT NULL
);

-- CreateIndex
CREATE INDEX "index_bridge_request_on_address" ON "BridgeRequest"("address");

-- CreateIndex
CREATE UNIQUE INDEX "BridgeHead_hash_key" ON "BridgeHead"("hash");
