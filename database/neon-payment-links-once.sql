-- =============================================================================
-- Ejecutar UNA VEZ en Neon (consola SQL o Vercel → Storage → tu BD)
-- Enlaces de pago: idioma huésped + corrección is_active NULL
-- =============================================================================

-- 1) Columna guest_locale (inglés/español en book.delfincheckin.com/pay/...)
ALTER TABLE payment_links
ADD COLUMN IF NOT EXISTS guest_locale VARCHAR(5) NOT NULL DEFAULT 'es';

COMMENT ON COLUMN payment_links.guest_locale IS 'Idioma de la UI del enlace de pago en book.delfincheckin.com: es | en';

-- 2) Enlaces viejos con is_active NULL: tratarlos como activos si el pago no está completado
UPDATE payment_links
SET is_active = true, updated_at = NOW()
WHERE is_active IS NULL
  AND (payment_completed IS NOT TRUE OR payment_completed IS NULL);

-- 3) Nuevos enlaces: is_active por defecto true
ALTER TABLE payment_links
  ALTER COLUMN is_active SET DEFAULT true;
