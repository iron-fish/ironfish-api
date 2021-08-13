ALTER TABLE users
  DROP COLUMN discord_username,
  DROP COLUMN telegram_username,
  ADD COLUMN discord VARCHAR,
  ADD COLUMN telegram VARCHAR;
