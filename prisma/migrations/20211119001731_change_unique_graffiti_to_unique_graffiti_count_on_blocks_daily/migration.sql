-- AlterTable
ALTER TABLE "blocks_daily" DROP COLUMN "unique_graffiti",
ADD COLUMN     "unique_graffiti_count" INTEGER NOT NULL;
