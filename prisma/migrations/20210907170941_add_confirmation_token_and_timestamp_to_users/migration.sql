ALTER TABLE users 
  ADD COLUMN confirmation_token VARCHAR,
  ADD COLUMN confirmed_at TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX index_users_on_confirmation_token ON users(confirmation_token);
CREATE UNIQUE INDEX uq_users_on_confirmation_token ON users(confirmation_token);
