# 🚀 Ejecuta este SQL AHORA en Neon

## 📋 Instrucciones Rápidas

### 1️⃣ Abre Neon Console

```
https://console.neon.tech
```

### 2️⃣ Ve a SQL Editor

Click en **"SQL Editor"** en el menú lateral izquierdo

### 3️⃣ Copia y Pega este SQL:

```sql
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
```

### 4️⃣ Click en "Run" (botón verde)

### 5️⃣ Verifica el Resultado

Deberías ver algo como:

```
✅ Usuario marcado como SuperAdmin correctamente

Resultado de la query:
┌─────────────────────────────────────────────────────────┐
│ id  | email                        | full_name | role  │
├─────┼──────────────────────────────┼───────────┼───────┤
│ xxx | contacto@delfincheckin.com   | Admin     | owner │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Si hay Error

### Error: "user does not exist"

Ejecuta primero esto para ver qué usuarios existen:

```sql
SELECT id, email, full_name, role FROM tenant_users;
```

Si no está tu email, necesitas crearlo primero desde el admin panel.

---

## ✅ Una vez completado

**Avísame cuando esté ejecutado** y continuaré con el siguiente paso:
- Modificar el middleware para detectar superadmin
- Crear las páginas de SuperAdmin
- Añadir navegación en el menú lateral

---

## 🔗 Archivos relacionados

- Script completo: `database/add-superadmin-support.sql`
- Instrucciones detalladas: `INSTRUCCIONES_EJECUTAR_SUPERADMIN.sql`

