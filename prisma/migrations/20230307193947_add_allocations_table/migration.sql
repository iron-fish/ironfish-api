-- CreateEnum
CREATE TYPE "AllocationPool" AS ENUM ('POOL_ONE', 'POOL_TWO', 'POOL_THREE', 'POOL_FOUR');

-- CreateTable
CREATE TABLE "allocations" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pool" "AllocationPool" NOT NULL,
    "iron" DOUBLE PRECISION NOT NULL,
    "redemption_id" INTEGER NOT NULL,

    CONSTRAINT "allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "index_allocations_on_redemption_id" ON "allocations"("redemption_id");

-- CreateIndex
CREATE INDEX "index_allocations_on_pool" ON "allocations"("pool");

-- CreateIndex
CREATE UNIQUE INDEX "uq_on_redemption_and_pool" ON "allocations"("redemption_id", "pool");

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
