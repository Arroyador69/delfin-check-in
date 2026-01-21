-- ═══════════════════════════════════════════════════════════
-- 🌍 MIGRACIÓN: Añadir columna preferences para i18n
-- ═══════════════════════════════════════════════════════════
--
-- Esta migración añade la columna 'preferences' a la tabla tenants
-- para almacenar preferencias de usuario, incluyendo el idioma (locale).
--
-- Fecha: 2026-01-21
-- Autor: Sistema i18n
--
-- ═══════════════════════════════════════════════════════════

-- Añadir columna preferences si no existe
-- Usamos JSONB para flexibilidad y rendimiento
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name = 'preferences'
    ) THEN
        ALTER TABLE tenants 
        ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE '✅ Columna preferences añadida a tenants';
    ELSE
        RAISE NOTICE '⚠️ Columna preferences ya existe en tenants';
    END IF;
END $$;

-- Crear índice GIN para búsquedas eficientes en JSONB
CREATE INDEX IF NOT EXISTS idx_tenants_preferences 
ON tenants USING GIN (preferences);

RAISE NOTICE '✅ Índice GIN creado para preferences';

-- Comentario descriptivo
COMMENT ON COLUMN tenants.preferences IS 
'Preferencias del usuario en formato JSONB. Incluye: locale (idioma), theme, notifications, etc.';

-- Ejemplo de uso:
-- UPDATE tenants SET preferences = '{"locale": "en", "theme": "dark"}'::jsonb WHERE id = 1;
-- SELECT preferences->>'locale' AS locale FROM tenants WHERE id = 1;

RAISE NOTICE '✅ Migración completada: columna preferences añadida con éxito';
