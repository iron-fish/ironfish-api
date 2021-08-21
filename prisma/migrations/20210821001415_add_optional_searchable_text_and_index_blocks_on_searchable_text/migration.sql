-- AlterTable
ALTER TABLE "blocks" ADD COLUMN     "searchable_text" VARCHAR;

-- CreateIndex
CREATE INDEX "index_blocks_on_searchable_text" ON blocks using gin ("searchable_text" gin_trgm_ops);
