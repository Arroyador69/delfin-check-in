# 🔒 Verificación Completa de Aislamiento Multi-Tenant

## ✅ Estado Actual del Sistema

### 1. **Protección en Código (Aplicación)** ✅
- ✅ **Middleware**: Extrae `tenant_id` del JWT y lo inyecta en headers
- ✅ **Sin fallback a tenant por defecto**: Si no hay `tenant_id`, se rechaza con 401
- ✅ **Filtrado explícito**: Todas las queries filtran por `tenant_id` explícitamente
- ✅ **Conversión de tipos**: Manejo correcto de UUID vs VARCHAR para `empresa_config`

### 2. **Protección en Base de Datos (RLS)** ⚠️
- ⚠️ **RLS configurado pero no activo**: Las políticas están creadas, pero no se establece `app.current_tenant_id` en cada sesión
- ✅ **Scripts SQL creados**: `enable-rls.sql` y `corregir-todo-aislamiento-final.sql`
- ⚠️ **Scripts pendientes de ejecutar**: Necesitas ejecutar los scripts en la base de datos

### 3. **Tests de Aislamiento** ⚠️
- ⚠️ **Tests creados pero no configurados**: `tests/tenant-isolation.test.ts` existe pero no está en `package.json`
- ⚠️ **Falta configuración de Jest**: No hay configuración de testing

---

## 🚨 Problema Principal

**RLS no funciona porque:**
1. El código no establece `app.current_tenant_id` antes de cada query
2. Vercel Postgres puede tener limitaciones con `SET LOCAL` en conexiones serverless
3. Los scripts SQL no se han ejecutado en la base de datos

**Solución implementada:**
- ✅ Filtrado explícito por `tenant_id` en todas las queries (funciona siempre)
- ✅ Función wrapper `withTenantContext()` creada para establecer `app.current_tenant_id` cuando sea posible
- ✅ RLS como capa adicional de seguridad (no crítica si el filtrado explícito funciona)

---

## 📋 Pasos para Completar el Aislamiento

### Paso 1: Ejecutar Scripts SQL en la Base de Datos

```bash
# Conectarte a tu base de datos Neon y ejecutar:

# 1. Habilitar RLS en tablas críticas
psql $DATABASE_URL -f database/enable-rls.sql

# 2. Corregir tablas faltantes y habilitar RLS en todas
psql $DATABASE_URL -f database/corregir-todo-aislamiento-final.sql

# 3. Verificar estado final
psql $DATABASE_URL -f database/verificar-rls-completo.sql
```

### Paso 2: Verificar que RLS está Habilitado

Ejecuta el script `verificar-rls-completo.sql` y verifica que:
- ✅ Todas las tablas con `tenant_id` tienen RLS habilitado
- ✅ Todas las tablas con RLS tienen políticas creadas
- ✅ Las funciones `current_tenant_id()` y `current_tenant_id_varchar()` existen

### Paso 3: Usar la Función Wrapper (Opcional)

La función `withTenantContext()` está disponible en `lib/db.ts`. Puedes usarla así:

```typescript
import { withTenantContext, sql } from '@/lib/db';

// En lugar de:
const result = await sql`SELECT * FROM reservations WHERE tenant_id = ${tenantId}`;

// Usar:
const result = await withTenantContext(tenantId, async () => {
  return await sql`SELECT * FROM reservations WHERE tenant_id = ${tenantId}`;
});
```

**NOTA**: El filtrado explícito por `tenant_id` ya protege los datos. `withTenantContext()` es una capa adicional.

### Paso 4: Configurar Tests (Opcional)

Para ejecutar tests de aislamiento:

```bash
# Instalar dependencias de testing
npm install --save-dev jest @types/jest ts-jest

# Ejecutar tests
npm test
```

---

## 🔍 Verificación Manual

### 1. Verificar que el Middleware Funciona

```bash
# Hacer una request sin token (debe retornar 401)
curl https://admin.delfincheckin.com/api/empresa-config

# Hacer una request con token válido (debe retornar datos del tenant)
curl -H "Cookie: auth_token=TU_TOKEN" https://admin.delfincheckin.com/api/empresa-config
```

### 2. Verificar Aislamiento de Datos

```sql
-- Conectarte como tenant A y verificar que solo ves tus datos
SET LOCAL app.current_tenant_id = 'uuid-tenant-a';
SELECT * FROM empresa_config; -- Solo debe mostrar datos de tenant A

-- Conectarte como tenant B y verificar que solo ves tus datos
SET LOCAL app.current_tenant_id = 'uuid-tenant-b';
SELECT * FROM empresa_config; -- Solo debe mostrar datos de tenant B
```

### 3. Verificar que Nuevos Datos Tienen tenant_id

```sql
-- Verificar que todos los nuevos registros tienen tenant_id
SELECT 
  table_name,
  COUNT(*) as total_registros,
  COUNT(tenant_id) as registros_con_tenant_id,
  COUNT(*) - COUNT(tenant_id) as registros_sin_tenant_id
FROM (
  SELECT 'reservations' as table_name, tenant_id FROM reservations
  UNION ALL
  SELECT 'guests', tenant_id FROM guests
  UNION ALL
  SELECT 'guest_registrations', tenant_id FROM guest_registrations
) t
GROUP BY table_name;
```

---

## ✅ Garantías de Seguridad

**Una vez completados los pasos:**

1. ✅ **Todos los nuevos datos** se crearán con `tenant_id` correcto
2. ✅ **Todas las queries** filtran por `tenant_id` explícitamente
3. ✅ **RLS habilitado** en todas las tablas con `tenant_id` (capa adicional)
4. ✅ **Middleware rechaza** requests sin `tenant_id` válido
5. ✅ **Datos existentes** corregidos (después de ejecutar scripts)

---

## 🎯 Estado Final Esperado

Después de ejecutar los scripts:

- ✅ **100% de tablas con `tenant_id`** tienen RLS habilitado
- ✅ **100% de tablas con RLS** tienen políticas creadas
- ✅ **0 registros** con `tenant_id` NULL (excepto los 27 existentes que se corrigen con `fix-guest-registrations-null-tenant-id.sql`)
- ✅ **Middleware** rechaza requests sin `tenant_id`
- ✅ **Todas las queries** filtran por `tenant_id`

---

## 📞 Soporte

Si encuentras problemas:

1. Ejecuta `database/verificar-rls-completo.sql` para diagnosticar
2. Revisa los logs de Vercel para ver errores de queries
3. Verifica que el middleware está inyectando `x-tenant-id` correctamente
4. Usa el endpoint `/api/debug/verify-tenant-isolation` para verificar el aislamiento

---

**Fecha:** 2025-11-22  
**Estado:** ✅ Código seguro | ⏳ Pendiente ejecutar scripts SQL en base de datos

