-- soft-delete events for overcounted deposits
UPDATE events SET deleted_at = current_timestamp, points = 0
WHERE
  deposit_id IN (
  SELECT 
    deposits.id
  FROM
    deposits
  LEFT JOIN 
    blocks
  ON
    deposits.block_hash = blocks.hash
  WHERE
    deposits.main = true AND (blocks.main IS NULL OR blocks.main = false)
);

-- upsert events for undercounted mismatched deposits
INSERT INTO events (type, occurred_at, points, user_id, deposit_id)
SELECT
  'SEND_TRANSACTION' AS type,
  missing_events.block_timestamp AS occurred_at,
  1 AS points,
  users.id AS user_id,
  missing_events.deposit_id AS deposit_id
FROM
  users
JOIN
  (
    SELECT
      deposits.id AS deposit_id,
      deposits.graffiti AS deposit_graffiti,
      blocks.timestamp AS block_timestamp
    FROM
      deposits
    JOIN
      blocks
    ON
      deposits.block_hash = blocks.hash
    WHERE
      deposits.main = false AND blocks.main = true AND deposits.amount >= 10000000
  ) missing_events
ON
  users.graffiti = missing_events.deposit_graffiti
ON CONFLICT (deposit_id) DO UPDATE SET deleted_at = NULL, points = 1;

-- set deposits.main to match blocks.main
UPDATE deposits SET main = blocks.main
FROM blocks
WHERE deposits.block_hash = blocks.hash AND deposits.main <> blocks.main;

-- set main to false for deposits without blocks
UPDATE deposits SET main = false
WHERE
  deposits.id IN (
  SELECT
    deposits.id
  FROM
    deposits
  LEFT JOIN
    blocks
  ON
    deposits.block_hash = blocks.hash
  WHERE
    blocks.hash IS NULL
);
