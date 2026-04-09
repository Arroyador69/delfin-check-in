-- Enlaces creados sin DEFAULT en is_active pueden quedar NULL y el API los trataba como "desactivados".
-- Ejecutar una vez en Neon si hay enlaces afectados:
UPDATE payment_links
SET is_active = true, updated_at = NOW()
WHERE is_active IS NULL
  AND (payment_completed IS NOT TRUE OR payment_completed IS NULL);

ALTER TABLE payment_links
  ALTER COLUMN is_active SET DEFAULT true;
