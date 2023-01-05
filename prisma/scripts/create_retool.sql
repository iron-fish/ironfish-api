CREATE SCHEMA IF NOT EXISTS retool;

CREATE OR REPLACE VIEW retool.events AS
  SELECT
    id, 
    type,
    occurred_at,
    points,
    user_id,
    url
  FROM
    events;

CREATE OR REPLACE VIEW retool.users AS
  SELECT
    id, 
    graffiti,
    country_code,
    created_at
  FROM
    users;

CREATE OR REPLACE VIEW retool.user_points AS
  SELECT
    id, 
    user_id,
    total_points
  FROM
    user_points;

GRANT USAGE ON SCHEMA retool TO "retool-read";
GRANT SELECT ON ALL TABLES IN SCHEMA retool TO "retool-read";
