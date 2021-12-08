-- DropIndex
DROP INDEX "index_blocks_on_searchable_text";

-- AlterTable
ALTER TABLE "blocks" DROP COLUMN "searchable_text";
