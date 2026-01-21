-- ═══════════════════════════════════════════════════════════
-- 🌍 MIGRACIÓN: Añadir columna preferences para i18n
-- ═══════════════════════════════════════════════════════════
--
-- Esta migración añade la columna 'preferences' a la tabla tenants
-- para almacenar preferencias de usuario, incluyendo el idioma (locale).
--
-- ═══════════════════════════════════════════════════════════

-- Ejecutar todo en un solo bloque para evitar errores de sintaxis
DO $$ 
BEGIN
    -- Añadir columna preferences si no existe
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
    
    -- Crear índice GIN para búsquedas eficientes en JSONB (si no existe)
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_tenants_preferences'
    ) THEN
        CREATE INDEX idx_tenants_preferences ON tenants USING GIN (preferences);
        RAISE NOTICE '✅ Índice GIN creado para preferences';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_tenants_preferences ya existe';
    END IF;
    
    RAISE NOTICE '✅ Migración completada con éxito';
END $$;

-- Añadir comentario descriptivo
COMMENT ON COLUMN tenants.preferences IS 
'Preferencias del usuario en formato JSONB. Incluye: locale (idioma), theme, notifications, etc.';

-- Ejemplo de uso:
-- UPDATE tenants SET preferences = '{"locale": "en", "theme": "dark"}'::jsonb WHERE id = 1;
-- SELECT preferences->>'locale' AS locale FROM tenants WHERE id = 1;
