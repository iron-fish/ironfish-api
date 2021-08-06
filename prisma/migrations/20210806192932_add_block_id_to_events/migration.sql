ALTER TABLE events ADD COLUMN block_id INTEGER;

CREATE INDEX index_events_on_block_id ON events(block_id);

CREATE UNIQUE INDEX uq_events_on_block_id ON events(block_id);

ALTER TABLE ONLY events ADD CONSTRAINT "FK__events__block_id" FOREIGN KEY (block_id) REFERENCES blocks(id);
