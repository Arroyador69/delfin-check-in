# 🔒 Plan de Corrección de Aislamiento Multi-Tenant

## 🚨 Problemas Encontrados

### 1. **CRÍTICO: 27 registros en `guest_registrations` con `tenant_id` NULL**
   - **Causa:** La función `insertGuestRegistration` no estaba insertando `tenant_id`
   - **Impacto:** Estos registros no están aislados y pueden ser vistos por cualquier tenant
   - **Estado:** ✅ **CORREGIDO** - La función ahora incluye `tenant_id`

### 2. **Tablas sin `tenant_id` que deberían tenerlo:**
   - `calendar_events` - Eventos de calendario por tenant
   - `checkin_instructions` - Instrucciones de check-in por tenant
   - `commission_transactions` - Transacciones de comisión por tenant
   - `content_datasets` - Datasets de contenido por tenant
   - `content_templates` - Plantillas de contenido por tenant
   - `direct_reservations` - Verificar si ya tiene `tenant_id`

### 3. **Tablas a revisar (pueden no necesitar `tenant_id`):**
   - `audit_log` - Puede ser tabla global de auditoría
   - `lodging` - Puede ser tabla maestra
   - `dpa_reservations` - Verificar caso de uso

---

## ✅ Correcciones Aplicadas

### 1. Función `insertGuestRegistration` corregida
   - ✅ Agregado `tenant_id` al tipo de parámetro
   - ✅ Incluido `tenant_id` en el INSERT SQL
   - ✅ Conversión correcta de string a UUID

### 2. Scripts de corrección creados
   - ✅ `fix-guest-registrations-null-tenant-id.sql` - Corregir los 27 registros existentes
   - ✅ `agregar-tenant-id-tablas-faltantes.sql` - Agregar `tenant_id` a tablas que lo necesitan

---

## 📋 Plan de Acción

### Paso 1: Corregir los 27 registros existentes (URGENTE)

**Ejecutar en SQL Editor:**
```sql
-- 1. Ver qué registros tienen tenant_id NULL
SELECT * FROM guest_registrations WHERE tenant_id IS NULL;

-- 2. Intentar asociarlos con reservas
SELECT 
  gr.id,
  gr.reserva_ref,
  r.tenant_id
FROM guest_registrations gr
LEFT JOIN reservations r ON gr.reserva_ref = r.external_id OR gr.reserva_ref = r.id::text
WHERE gr.tenant_id IS NULL;

-- 3. Actualizar con tenant_id desde reservations
UPDATE guest_registrations gr
SET tenant_id = r.tenant_id
FROM reservations r
WHERE gr.tenant_id IS NULL
  AND (gr.reserva_ref = r.external_id OR gr.reserva_ref = r.id::text)
  AND r.tenant_id IS NOT NULL;
```

**Si algunos registros no tienen reserva asociada:**
- Opción A: Asignar manualmente el `tenant_id` correcto
- Opción B: Eliminar si son registros obsoletos o de prueba

### Paso 2: Agregar `tenant_id` a tablas faltantes

**Ejecutar el script completo:**
```sql
-- Ejecutar: database/agregar-tenant-id-tablas-faltantes.sql
```

Este script:
- Agrega `tenant_id` a las tablas que lo necesitan
- Crea índices para rendimiento
- Verifica que no exista antes de agregarlo

### Paso 3: Habilitar RLS en nuevas tablas

**Después de agregar `tenant_id`, habilitar RLS:**
```sql
-- Habilitar RLS en las nuevas tablas
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS (similar a enable-rls.sql)
-- ... (ver enable-rls.sql para el patrón)
```

### Paso 4: Verificar que el código filtre por `tenant_id`

**Auditar endpoints que usan estas tablas:**
- `/api/calendar/*` - Debe filtrar por `tenant_id`
- `/api/checkin-instructions/*` - Debe filtrar por `tenant_id`
- `/api/commission/*` - Debe filtrar por `tenant_id`
- `/api/content/*` - Debe filtrar por `tenant_id`

---

## 🔍 Verificación Final

**Ejecutar después de todas las correcciones:**
```sql
-- Verificar que no hay más registros con tenant_id NULL
SELECT 
  'guest_registrations' as tabla,
  COUNT(*) as registros_sin_tenant_id
FROM guest_registrations
WHERE tenant_id IS NULL;

-- Verificar que todas las tablas críticas tienen tenant_id
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
  AND table_name IN (
    'guest_registrations',
    'calendar_events',
    'checkin_instructions',
    'commission_transactions',
    'content_datasets',
    'content_templates'
  );
```

---

## ⚠️ Importante

1. **Hacer backup antes de ejecutar los scripts de corrección**
2. **Ejecutar primero las queries de verificación para entender el impacto**
3. **Los 27 registros con `tenant_id` NULL deben corregirse URGENTEMENTE**
4. **Después de agregar `tenant_id` a nuevas tablas, migrar datos existentes si los hay**

---

## 📊 Estado Actual

- ✅ Función `insertGuestRegistration` corregida
- ✅ Scripts de corrección creados
- ⏳ Pendiente: Ejecutar corrección de 27 registros
- ⏳ Pendiente: Agregar `tenant_id` a tablas faltantes
- ⏳ Pendiente: Habilitar RLS en nuevas tablas
- ⏳ Pendiente: Auditar código que usa estas tablas

---

**Fecha:** 2025-11-22
**Prioridad:** 🔴 CRÍTICA - Aislamiento de datos comprometido

