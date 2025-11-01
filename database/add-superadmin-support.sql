-- ============================================
-- MIGRACIÓN: Agregar soporte para SuperAdmin
-- ============================================
-- Este script añade la capacidad de marcar usuarios como
-- platform administrators que tienen acceso especial

-- ============================================
-- PASO 1: Añadir columna is_platform_admin
-- ============================================

ALTER TABLE tenant_users 
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- Índice para búsquedas rápidas de superadmins
CREATE INDEX IF NOT EXISTS idx_tenant_users_is_platform_admin 
ON tenant_users(is_platform_admin) 
WHERE is_platform_admin = true;

-- Comentario para documentación
COMMENT ON COLUMN tenant_users.is_platform_admin IS 
  'Indica si este usuario es administrador de la plataforma (superadmin). Solo debe haber muy pocos de estos.';

-- ============================================
-- PASO 2: Marcar a Alberto como SuperAdmin
-- ============================================

-- IMPORTANTE: Cambia 'contacto@delfincheckin.com' por tu email real
UPDATE tenant_users 
SET is_platform_admin = true,
    updated_at = NOW()
WHERE email = 'contacto@delfincheckin.com';

-- Verificar que se actualizó correctamente
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM tenant_users WHERE is_platform_admin = true) = 0 THEN
    RAISE NOTICE '⚠️  ADVERTENCIA: No se encontró el usuario con email contacto@delfincheckin.com';
    RAISE NOTICE '   Verifica que el email sea correcto o crea el usuario primero';
  ELSE
    RAISE NOTICE '✅ Usuario marcado como SuperAdmin correctamente';
  END IF;
END $$;

-- ============================================
-- PASO 3: Verificación final
-- ============================================

-- Mostrar todos los superadmins
SELECT 
  id,
  email,
  full_name,
  role,
  is_platform_admin,
  created_at
FROM tenant_users
WHERE is_platform_admin = true;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
/*
1. Solo debes marcar muy pocos usuarios como superadmin (idealmente solo 1-2)
2. Los superadmins pueden acceder a /superadmin en el admin panel
3. Los superadmins PUEDEN acceder también a su panel normal de tenant
4. Cambia 'contacto@delfincheckin.com' por el email que realmente usas
5. Asegúrate de que ese usuario existe en tenant_users antes de ejecutar

Para deshacer esta migración:
  UPDATE tenant_users SET is_platform_admin = false;
  DROP INDEX IF EXISTS idx_tenant_users_is_platform_admin;
  ALTER TABLE tenant_users DROP COLUMN IF EXISTS is_platform_admin;
*/

