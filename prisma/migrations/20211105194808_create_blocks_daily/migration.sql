-- CreateTable
CREATE TABLE "blocks_daily" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(6) NOT NULL,
    "unique_graffiti" INTEGER NOT NULL,
    "marked_blocks" INTEGER NOT NULL,
    "chain_height" INTEGER NOT NULL,

    CONSTRAINT "blocks_daily_pkey" PRIMARY KEY ("id")
);
