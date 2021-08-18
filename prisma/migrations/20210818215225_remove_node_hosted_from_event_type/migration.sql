BEGIN;
CREATE TYPE event_type_new AS ENUM ('BLOCK_MINED', 'BUG_CAUGHT', 'COMMUNITY_CONTRIBUTION', 'PULL_REQUEST_MERGED', 'SOCIAL_MEDIA_PROMOTION');
ALTER TABLE events ALTER COLUMN type TYPE event_type_new USING (type::text::event_type_new);
ALTER TYPE event_type RENAME TO event_type_old;
ALTER TYPE event_type_new RENAME TO event_type;
DROP TYPE event_type_old;
COMMIT;
