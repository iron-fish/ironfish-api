DROP INDEX uq_users_on_email;

DROP INDEX uq_users_on_graffiti;

ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITHOUT TIME ZONE;
