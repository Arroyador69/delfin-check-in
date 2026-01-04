# 📚 Explicación: Habitaciones vs Propiedades en SuperAdmin

## ⚠️ Importante: Confusión Común

Hay una diferencia importante entre **HABITACIONES** y **PROPIEDADES** en el sistema.

## 🏨 Habitaciones (Room)

- **Tabla**: `Room`
- **Qué son**: Las habitaciones físicas de tu hostal
- **Tu caso**: Tienes 6 habitaciones (Habitación 1-6)
- **Dónde se ven**: En las **landings públicas** (automáticamente)

## 📋 Propiedades (tenant_properties)

- **Tabla**: `tenant_properties`
- **Qué son**: Las "propiedades" que gestionas en el sistema
- **Dónde se ven**: En el **SuperAdmin** (en los selectores)
- **Conexión**: Pueden estar conectadas con habitaciones vía `property_room_map`

## 🔍 ¿Por qué no ves las 6 habitaciones en SuperAdmin?

**El SuperAdmin NO muestra habitaciones directamente.**

El SuperAdmin muestra **PROPIEDADES** de la tabla `tenant_properties`.

Si no ves propiedades en el SuperAdmin, significa que:
- ✅ Tienes las 6 habitaciones en `Room` (correcto)
- ❌ Pero NO tienes propiedades creadas en `tenant_properties`

## ✅ Solución: Crear Propiedades

Tienes dos opciones:

### Opción 1: Crear Propiedades desde el Panel Normal

1. Ve a tu panel de administración normal (no SuperAdmin)
2. Ve a la sección de **Propiedades** o **Habitaciones**
3. Crea propiedades/habitaciones desde ahí
4. El sistema creará automáticamente:
   - Entrada en `tenant_properties`
   - Mapping en `property_room_map` (si aplica)

### Opción 2: Crear Propiedades Manualmente (SQL)

Si prefieres crear propiedades directamente:

```sql
-- Ejemplo: Crear una propiedad para tu hostal
INSERT INTO tenant_properties (
    tenant_id,
    property_name,
    description,
    photos,
    max_guests,
    bedrooms,
    bathrooms,
    amenities,
    base_price,
    cleaning_fee,
    security_deposit,
    minimum_nights,
    maximum_nights,
    is_active
) VALUES (
    'TU-TENANT-ID-AQUI',  -- Reemplaza con tu tenant_id
    'Mi Hostal Principal',
    'Descripción de tu hostal',
    '[]'::jsonb,
    4,  -- max_guests
    2,  -- bedrooms
    1,  -- bathrooms
    '["wifi", "aire acondicionado"]'::jsonb,
    50.00,  -- base_price
    10.00,  -- cleaning_fee
    0.00,   -- security_deposit
    1,      -- minimum_nights
    30,     -- maximum_nights
    true    -- is_active
) RETURNING id;
```

## 🔗 Cómo Funciona el Sistema Completo

```
┌─────────────────────────────────────────┐
│  SUPERADMIN (Selectores)                │
│  ↓                                       │
│  Muestra: tenant_properties             │
│  (NO muestra Room directamente)         │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  CREAR SEÑAL/LANDING                    │
│  ↓                                       │
│  Seleccionas una propiedad              │
│  (de tenant_properties)                 │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  LANDING PÚBLICA (Renderizado)          │
│  ↓                                       │
│  Busca el tenant_id de la landing       │
│  ↓                                       │
│  Busca el lodging_id del tenant         │
│  ↓                                       │
│  Obtiene TODAS las habitaciones         │
│  desde Room donde lodgingId = lodging_id│
│  ↓                                       │
│  Muestra las 6 habitaciones             │
└─────────────────────────────────────────┘
```

## 📊 Script de Diagnóstico

Ejecuta este script SQL para ver el estado:

```sql
-- Ver qué tienes
SELECT 
    'Habitaciones en Room' as tipo,
    COUNT(*)::text as total
FROM "Room"
UNION ALL
SELECT 
    'Propiedades en tenant_properties' as tipo,
    COUNT(*)::text as total
FROM tenant_properties
WHERE is_active = true;
```

## ✅ Resumen

1. **Habitaciones (Room)**: ✅ Tienes 6 (correcto)
2. **Propiedades (tenant_properties)**: ❓ ¿Tienes propiedades creadas?
3. **SuperAdmin muestra**: Propiedades (no habitaciones)
4. **Landings muestran**: Habitaciones (automáticamente desde Room)

## 🎯 Próximos Pasos

1. Ejecuta el script de diagnóstico: `database/diagnostico-propiedades-habitaciones.sql`
2. Verifica si tienes propiedades en `tenant_properties`
3. Si no tienes, créalas desde tu panel normal o manualmente
4. Luego podrás seleccionarlas en SuperAdmin → Radar Reach

