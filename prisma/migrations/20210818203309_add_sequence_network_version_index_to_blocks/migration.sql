-- CreateIndex
CREATE INDEX "index_blocks_on_sequence_and_network_version" ON "blocks"("sequence", "network_version");
