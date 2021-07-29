ALTER TABLE events DROP CONSTRAINT "FK__events__account_id";

DROP INDEX index_events_on_account_id;

ALTER TABLE events DROP COLUMN account_id;

DROP TABLE accounts;
