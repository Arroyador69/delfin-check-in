# 🔗 Guía: Conectar Habitaciones con Radar Reach

Esta guía te explica cómo conectar tus 6 habitaciones con el sistema Radar Reach.

## 📋 Estado Actual

Tienes:
- ✅ Tabla `Room` con 6 habitaciones (Habitación 1-6)
- ✅ Tabla `radar_signals` creada
- ✅ Tabla `dynamic_landings` creada (asumimos)
- ⚠️ Necesitas conectar: `tenants.lodging_id` con `Room.lodgingId`

## 🔍 Verificación Paso a Paso

### Paso 1: Verificar la Estructura

En tu base de datos (Vercel/Neon), ejecuta este query para ver el estado:

```sql
-- Verificar si tenants tiene lodging_id
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name = 'lodging_id';
```

**Si NO existe la columna `lodging_id`:**
- El script SQL que creé la añadirá automáticamente

### Paso 2: Ejecutar el Script de Conexión

Ejecuta el script: `database/conectar-radar-reach-habitaciones.sql`

Este script:
1. ✅ Añade `lodging_id` a `tenants` si no existe
2. ✅ Conecta cada tenant con su `lodgingId` de las habitaciones
3. ✅ Verifica que todo esté conectado

### Paso 3: Verificar la Conexión

Después de ejecutar el script, verifica:

```sql
-- Ver tenants conectados con habitaciones
SELECT 
    t.id as tenant_id,
    t.name,
    t.email,
    t.lodging_id,
    COUNT(r.id) as total_habitaciones
FROM tenants t
LEFT JOIN "Room" r ON r."lodgingId" = t.lodging_id
GROUP BY t.id, t.name, t.email, t.lodging_id;
```

Deberías ver:
- Tu tenant con su `lodging_id`
- 6 habitaciones conectadas

## 🎯 Cómo Funciona la Conexión

```
tenants (tu cuenta)
    ↓ lodging_id
Room.lodgingId (6 habitaciones)
    ↓ (opcional, si hay mapping)
property_room_map
    ↓
tenant_properties (propiedades con detalles)
```

### Flujo en Radar Reach:

1. **Crear Señal del Radar:**
   - Seleccionas una `tenant_property`
   - La señal se guarda en `radar_signals`

2. **Crear Landing:**
   - Seleccionas una `tenant_property`
   - La landing se guarda en `dynamic_landings`

3. **Ver Landing Publicada:**
   - El sistema busca el `tenant_id` de la landing
   - Busca el `lodging_id` del tenant
   - Obtiene TODAS las habitaciones desde `Room` donde `lodgingId = lodging_id`
   - Muestra las 6 habitaciones en la landing

## ⚠️ Si Algo No Funciona

### Problema 1: No veo las habitaciones en la landing

**Solución:**
1. Verifica que `tenants.lodging_id` esté configurado:
```sql
SELECT id, name, email, lodging_id 
FROM tenants 
WHERE id = 'TU-TENANT-ID';
```

2. Verifica que las habitaciones tengan el `lodgingId` correcto:
```sql
SELECT id, name, "lodgingId" 
FROM "Room" 
WHERE "lodgingId" = 'TU-LODGING-ID';
```

3. Si no coinciden, actualiza manualmente:
```sql
UPDATE tenants 
SET lodging_id = 'EL-LODGING-ID-DE-TUS-HABITACIONES'
WHERE id = 'TU-TENANT-ID';
```

### Problema 2: El script no encuentra el lodgingId

**Solución manual:**
1. Busca el `lodgingId` de tus habitaciones:
```sql
SELECT DISTINCT "lodgingId" 
FROM "Room" 
LIMIT 1;
```

2. Actualiza tu tenant con ese `lodgingId`:
```sql
UPDATE tenants 
SET lodging_id = 'EL-LODGING-ID-ENCONTRADO'
WHERE id = 'TU-TENANT-ID';
```

## ✅ Checklist Final

Antes de crear landings, verifica:

- [ ] Tabla `radar_signals` existe
- [ ] Tabla `dynamic_landings` existe
- [ ] Tabla `tenants` tiene columna `lodging_id`
- [ ] Tu tenant tiene `lodging_id` configurado
- [ ] Las 6 habitaciones tienen el mismo `lodgingId`
- [ ] El `lodgingId` de las habitaciones coincide con `tenants.lodging_id`

## 🚀 Próximos Pasos

Una vez conectado:

1. **Ve a SuperAdmin → Radar Reach**
2. **Crea una Señal del Radar:**
   - Selecciona tu propiedad
   - Rellena los datos
   - Guarda

3. **Crea una Landing:**
   - Selecciona tu propiedad
   - Crea un slug único
   - Genera contenido (o usa IA)
   - Marca como "Publicado"
   - Guarda

4. **Verifica la Landing:**
   - Visita: `https://book.delfincheckin.com/[TU-TENANT-ID]/landing/[SLUG]`
   - Deberías ver las 6 habitaciones listadas

## 📞 Si Necesitas Ayuda

Si después de ejecutar el script sigues teniendo problemas:
1. Comparte el resultado del query de verificación
2. Comparte el `lodgingId` de tus habitaciones
3. Comparte tu `tenant_id`

Con esa información puedo ayudarte a conectar todo correctamente.

