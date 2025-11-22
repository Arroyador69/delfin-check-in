-- ========================================
-- ROW LEVEL SECURITY (RLS) PARA MULTI-TENANT
-- ========================================
-- Este script implementa Row Level Security en PostgreSQL
-- para asegurar que cada tenant solo pueda acceder a sus propios datos

-- IMPORTANTE: Ejecutar este script en la base de datos de producción
-- para habilitar el aislamiento de datos a nivel de base de datos

-- ========================================
-- 1. HABILITAR RLS EN TABLAS CRÍTICAS
-- ========================================

-- Tabla: empresa_config
ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;

-- Tabla: tenant_users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Tabla: reservations (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reservations') THEN
    ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Tabla: guests (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guests') THEN
    ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Tabla: guest_registrations (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_registrations') THEN
    ALTER TABLE guest_registrations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Tabla: property_room_map (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_room_map') THEN
    ALTER TABLE property_room_map ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ========================================
-- 2. CREAR FUNCIÓN PARA OBTENER TENANT_ID ACTUAL
-- ========================================

-- Esta función obtiene el tenant_id del contexto de la sesión
-- Se establece mediante: SET LOCAL app.current_tenant_id = 'uuid';

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 3. CREAR POLÍTICAS RLS
-- ========================================

-- Política para empresa_config: solo ver tu propio tenant
DROP POLICY IF EXISTS empresa_config_tenant_isolation ON empresa_config;
CREATE POLICY empresa_config_tenant_isolation ON empresa_config
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Política para tenant_users: solo ver usuarios de tu tenant
DROP POLICY IF EXISTS tenant_users_tenant_isolation ON tenant_users;
CREATE POLICY tenant_users_tenant_isolation ON tenant_users
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Política para reservations (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reservations') THEN
    DROP POLICY IF EXISTS reservations_tenant_isolation ON reservations;
    EXECUTE 'CREATE POLICY reservations_tenant_isolation ON reservations
      FOR ALL
      USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
  END IF;
END $$;

-- Política para guests (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guests') THEN
    DROP POLICY IF EXISTS guests_tenant_isolation ON guests;
    EXECUTE 'CREATE POLICY guests_tenant_isolation ON guests
      FOR ALL
      USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
  END IF;
END $$;

-- Política para guest_registrations (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_registrations') THEN
    DROP POLICY IF EXISTS guest_registrations_tenant_isolation ON guest_registrations;
    EXECUTE 'CREATE POLICY guest_registrations_tenant_isolation ON guest_registrations
      FOR ALL
      USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
  END IF;
END $$;

-- Política para property_room_map (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_room_map') THEN
    DROP POLICY IF EXISTS property_room_map_tenant_isolation ON property_room_map;
    EXECUTE 'CREATE POLICY property_room_map_tenant_isolation ON property_room_map
      FOR ALL
      USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
  END IF;
END $$;

-- ========================================
-- 4. NOTAS IMPORTANTES
-- ========================================

-- ⚠️ IMPORTANTE: RLS requiere que la aplicación establezca el tenant_id en cada sesión
-- 
-- Para usar RLS, antes de cada query, ejecutar:
-- SET LOCAL app.current_tenant_id = 'uuid-del-tenant';
--
-- O usar una función wrapper que lo haga automáticamente.
--
-- NOTA: En Vercel Postgres, RLS puede tener limitaciones.
-- La mejor práctica es filtrar siempre por tenant_id en las queries de la aplicación.

-- ========================================
-- 5. VERIFICAR RLS HABILITADO
-- ========================================

-- Verificar que RLS está habilitado:
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('empresa_config', 'tenant_users', 'reservations', 'guests', 'guest_registrations', 'property_room_map')
ORDER BY tablename;

