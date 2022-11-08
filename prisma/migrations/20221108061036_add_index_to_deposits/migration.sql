-- CreateIndex
CREATE INDEX "index_deposits_on_block_hash_and_network_version" ON "deposits"("block_hash", "network_version");
