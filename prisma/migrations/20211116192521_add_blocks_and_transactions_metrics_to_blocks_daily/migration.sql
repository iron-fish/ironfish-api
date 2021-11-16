-- AlterTable
ALTER TABLE "blocks_daily" DROP COLUMN "marked_blocks",
ADD COLUMN     "average_block_time_ms" INTEGER NOT NULL,
ADD COLUMN     "average_difficulty" INTEGER NOT NULL,
ADD COLUMN     "blocks_count" INTEGER NOT NULL,
ADD COLUMN     "blocks_with_graffiti_count" INTEGER NOT NULL,
ADD COLUMN     "cumulative_unique_graffiti" INTEGER NOT NULL,
ADD COLUMN     "transactions_count" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "index_blocks_daily_on_date" ON "blocks_daily"("date");
