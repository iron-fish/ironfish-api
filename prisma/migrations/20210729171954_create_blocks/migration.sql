CREATE TABLE blocks (
    id SERIAL PRIMARY KEY NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hash VARCHAR NOT NULL,
    sequence INTEGER NOT NULL,
    previous_block_hash VARCHAR,
    difficulty INTEGER NOT NULL,
    main BOOLEAN NOT NULL,
    network_version INTEGER NOT NULL,
    transactions_count INTEGER NOT NULL,
    timestamp TIMESTAMP(6) NOT NULL
);

CREATE INDEX index_blocks_on_hash ON public.blocks USING btree (hash);
