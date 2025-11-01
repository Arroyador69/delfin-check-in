# 📋 Instrucciones para Ejecutar el Script de SuperAdmin

## 🎯 Objetivo
Agregar el campo `is_platform_admin` a la tabla `tenant_users` y marcarte como SuperAdmin.

---

## ✅ PASO 1: Verificar tu Email

Antes de ejecutar, verifica que tu usuario existe:

```sql
-- Verificar que tu usuario existe
SELECT id, email, full_name, role 
FROM tenant_users 
WHERE email = 'contacto@delfincheckin.com';
```

**Si no devuelve resultados**, necesitas crear tu usuario primero.

---

## ✅ PASO 2: Ejecutar en Neon

### Opción A: Desde el Dashboard de Neon (Recomendado)

1. Ve a: https://console.neon.tech
2. Selecciona tu proyecto
3. Click en **"SQL Editor"** en el menú lateral
4. Copia el contenido completo de `database/add-superadmin-support.sql`
5. Pégalo en el editor
6. Click en **"Run"** (botón verde)

### Opción B: Desde Vercel (Si tienes acceso directo)

Si prefieres ejecutarlo localmente con psql:

```bash
# Conectarte a Neon desde terminal
psql "tu_connection_string_de_neon"

# Luego ejecutar:
\i database/add-superadmin-support.sql
```

### Opción C: Desde tu IDE con extensión de PostgreSQL

Si tienes una extensión de PostgreSQL instalada:
1. Conéctate a tu base de datos Neon
2. Abre `database/add-superadmin-support.sql`
3. Ejecuta el script completo

---

## ✅ PASO 3: Verificar la Ejecución

Después de ejecutar, deberías ver:

```
✅ Usuario marcado como SuperAdmin correctamente

Resultado de la query final:
```

Verás tu usuario con `is_platform_admin = true`

---

## ⚠️ Si falla

### Error: "user does not exist"

Significa que tu email `contacto@delfincheckin.com` no existe en `tenant_users`.

**Solución:**
1. Crea tu usuario primero en `/admin-setup` o
2. Ejecuta este script primero:

```sql
-- Ver todos los usuarios que existen
SELECT id, email, full_name FROM tenant_users;

-- Si no existe tu usuario, créalo manualmente
-- (necesitarás hashear la contraseña primero)
```

---

## 🔍 Verificar Manualmente

Para verificar después:

```sql
-- Ver todos los superadmins
SELECT id, email, full_name, role, is_platform_admin
FROM tenant_users
WHERE is_platform_admin = true;

-- Deberías ver tu email (contacto@delfincheckin.com)
```

---

## 🚫 Deshacer (si es necesario)

Si quieres revertir los cambios:

```sql
-- Quitar el flag de superadmin
UPDATE tenant_users 
SET is_platform_admin = false
WHERE email = 'contacto@delfincheckin.com';

-- Eliminar la columna completamente
DROP INDEX IF EXISTS idx_tenant_users_is_platform_admin;
ALTER TABLE tenant_users DROP COLUMN IF EXISTS is_platform_admin;
```

---

## ✅ Una vez completado

Después de ejecutar el script exitosamente:

1. ✅ La columna `is_platform_admin` estará en `tenant_users`
2. ✅ Tu usuario tendrá `is_platform_admin = true`
3. ✅ Podremos continuar con el código frontend

**Siguiente paso:** Crear las páginas de SuperAdmin en `/superadmin`

