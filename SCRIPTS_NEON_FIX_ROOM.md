# 🔧 Scripts para Arreglar la Tabla Room en Neon

## Problema Identificado
El error `column "updated_at" of relation "Room" does not exist` indica que la tabla `Room` no tiene las columnas necesarias.

## Scripts SQL para Ejecutar en Neon

### 1. Verificar la Estructura Actual de la Tabla Room
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Room'
ORDER BY ordinal_position;
```

### 2. Agregar la Columna `updated_at` (si no existe)
```sql
ALTER TABLE "Room" 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### 3. Agregar la Columna `created_at` (si no existe)
```sql
ALTER TABLE "Room" 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### 4. Verificar que las Columnas se Agregaron Correctamente
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Room'
ORDER BY ordinal_position;
```

### 5. Actualizar tu Tenant para 6 Habitaciones
```sql
UPDATE tenants 
SET max_rooms = 6, updated_at = NOW()
WHERE id = '870e589f-d313-4a5a-901f-f25fd4e7240a';
```

### 6. Crear las 6 Habitaciones para tu Tenant
```sql
-- Primero obtén tu lodging_id
SELECT lodging_id FROM tenants WHERE id = '870e589f-d313-4a5a-901f-f25fd4e7240a';

-- Luego crea las habitaciones (reemplaza 'TU_LODGING_ID' con el ID real)
INSERT INTO "Room" (id, name, "lodgingId", created_at, updated_at)
VALUES 
  ('1', 'Habitación 1', 'TU_LODGING_ID', NOW(), NOW()),
  ('2', 'Habitación 2', 'TU_LODGING_ID', NOW(), NOW()),
  ('3', 'Habitación 3', 'TU_LODGING_ID', NOW(), NOW()),
  ('4', 'Habitación 4', 'TU_LODGING_ID', NOW(), NOW()),
  ('5', 'Habitación 5', 'TU_LODGING_ID', NOW(), NOW()),
  ('6', 'Habitación 6', 'TU_LODGING_ID', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();
```

### 7. Verificar que Todo Esté Correcto
```sql
-- Verificar tu tenant
SELECT id, name, max_rooms FROM tenants WHERE id = '870e589f-d313-4a5a-901f-f25fd4e7240a';

-- Verificar las habitaciones creadas
SELECT COUNT(*) as total_rooms FROM "Room" WHERE "lodgingId" = 'TU_LODGING_ID';

-- Ver todas las habitaciones
SELECT id, name, "lodgingId", created_at, updated_at FROM "Room" WHERE "lodgingId" = 'TU_LODGING_ID' ORDER BY id;
```

## Pasos a Seguir en Neon

1. **Ve a tu proyecto en Neon**
2. **Abre el SQL Editor**
3. **Ejecuta los scripts en este orden:**
   - Script 1 (verificar estructura)
   - Script 2 (agregar updated_at)
   - Script 3 (agregar created_at)
   - Script 4 (verificar columnas)
   - Script 5 (actualizar tenant)
   - Script 6 (crear habitaciones - **IMPORTANTE**: reemplaza 'TU_LODGING_ID' con tu ID real)
   - Script 7 (verificar todo)

## Notas Importantes

- **Reemplaza 'TU_LODGING_ID'** con el ID real que obtengas del script 5
- **Tu tenant ID** es: `870e589f-d313-4a5a-901f-f25fd4e7240a`
- **Ejecuta los scripts uno por uno** para verificar que no hay errores
- **Después de ejecutar todo**, intenta guardar las habitaciones en la aplicación

## Resultado Esperado

Después de ejecutar estos scripts:
- ✅ La tabla `Room` tendrá las columnas `created_at` y `updated_at`
- ✅ Tu tenant tendrá `max_rooms = 6`
- ✅ Tendrás 6 habitaciones creadas en la base de datos
- ✅ Podrás guardar habitaciones sin errores en la aplicación
