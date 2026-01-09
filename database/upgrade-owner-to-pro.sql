-- ========================================
-- ACTUALIZAR TENANT PERSONAL Y SUPERADMIN A PLAN PRO
-- ========================================
-- Este script actualiza el tenant personal del creador y los tenants
-- asociados a usuarios superadmin a plan PRO (sin anuncios)

-- ========================================
-- 1. ACTUALIZAR TENANT PERSONAL (870e589f-d313-4a5a-901f-f25fd4e7240a)
-- ========================================
UPDATE tenants
SET 
  plan_type = 'pro',
  plan_id = 'enterprise', -- Para compatibilidad con sistema antiguo
  ads_enabled = false, -- Sin anuncios en PRO
  legal_module = true, -- Módulo legal incluido en PRO
  max_rooms = 6, -- 6 habitaciones incluidas en PRO
  max_rooms_included = 6,
  base_plan_price = 29.99,
  extra_room_price = NULL, -- No aplica en PRO
  vat_rate = 21.00, -- IVA España
  updated_at = NOW()
WHERE id = '870e589f-d313-4a5a-901f-f25fd4e7240a';

-- ========================================
-- 2. ACTUALIZAR TODOS LOS TENANTS DE SUPERADMINS
-- ========================================
-- Encontrar todos los tenants asociados a usuarios superadmin
UPDATE tenants
SET 
  plan_type = 'pro',
  plan_id = 'enterprise', -- Para compatibilidad con sistema antiguo
  ads_enabled = false, -- Sin anuncios en PRO
  legal_module = true, -- Módulo legal incluido en PRO
  max_rooms = 6, -- 6 habitaciones incluidas en PRO
  max_rooms_included = 6,
  base_plan_price = 29.99,
  extra_room_price = NULL, -- No aplica en PRO
  vat_rate = 21.00, -- IVA España
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT tenant_id 
  FROM tenant_users 
  WHERE is_platform_admin = true
);

-- ========================================
-- 3. VERIFICACIÓN
-- ========================================
-- Verificar que se actualizaron correctamente
SELECT 
  id,
  name,
  email,
  plan_type,
  plan_id,
  ads_enabled,
  legal_module,
  max_rooms,
  max_rooms_included,
  base_plan_price
FROM tenants
WHERE id = '870e589f-d313-4a5a-901f-f25fd4e7240a'
   OR id IN (
     SELECT DISTINCT tenant_id 
     FROM tenant_users 
     WHERE is_platform_admin = true
   )
ORDER BY name;

-- ========================================
-- NOTAS
-- ========================================
-- ✅ Tenant personal actualizado a PRO
-- ✅ Todos los tenants de superadmins actualizados a PRO
-- ✅ ads_enabled = false (sin anuncios)
-- ✅ legal_module = true (módulo legal incluido)
-- ✅ max_rooms = 6 (6 habitaciones incluidas)
