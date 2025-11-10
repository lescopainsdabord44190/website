ALTER TABLE counselors
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) - 1 AS rn
  FROM counselors
)
UPDATE counselors AS c
SET order_index = ordered.rn
FROM ordered
WHERE c.id = ordered.id;

ALTER TABLE counselors
  ALTER COLUMN order_index SET NOT NULL;


