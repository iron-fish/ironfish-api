CREATE INDEX index_blocks_on_hash_and_network_version ON blocks(hash, network_version);
CREATE UNIQUE INDEX uq_blocks_on_hash_and_network_version ON blocks(hash, network_version);
