-- AlterTable
ALTER TABLE "blocks_daily" DROP COLUMN "average_difficulty",
DROP COLUMN "chain_height",
ADD COLUMN     "average_difficulty_millis" INTEGER NOT NULL,
ADD COLUMN     "chain_sequence" INTEGER NOT NULL;