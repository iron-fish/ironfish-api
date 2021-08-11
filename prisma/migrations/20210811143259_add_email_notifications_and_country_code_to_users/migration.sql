ALTER TABLE users ADD COLUMN country_code VARCHAR;
ALTER TABLE users ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT false;
