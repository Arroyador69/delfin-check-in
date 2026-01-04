# 🔍 Diagnóstico: Propiedades no aparecen en SuperAdmin

## ⚠️ Problema Identificado

El selector de propiedades en el modal de Radar Reach está vacío.

## 🎯 ¿Qué debería ver?

En el SuperAdmin → Radar Reach → "Nueva Señal":
- El campo **"Propiedad"** debería mostrar una lista desplegable con las propiedades
- Cada propiedad aparece como: "Nombre Propiedad (Nombre Tenant)"

## 📊 Verificación Paso a Paso

### 1. Verificar que las propiedades existan y estén activas

Ejecuta este query en el SQL Editor:

```sql
SELECT 
    tp.id,
    tp.property_name,
    tp.is_active,
    tp.tenant_id,
    t.name as tenant_name
FROM tenant_properties tp
JOIN tenants t ON tp.tenant_id = t.id
WHERE tp.is_active = true
ORDER BY t.name, tp.property_name;
```

**Resultado esperado:**
- Deberías ver 6 propiedades (Habitación 1, 2, 3, 4, 5, 6)
- Todas deben tener `is_active = true`

### 2. Verificar que la API funcione

La API que carga las propiedades es: `/api/superadmin/properties`

Esta API:
- Verifica que seas SuperAdmin
- Obtiene todas las propiedades activas de `tenant_properties`
- Las devuelve en formato JSON

### 3. Verificar en el navegador (Consola)

1. Abre el SuperAdmin → Radar Reach
2. Abre la consola del navegador (F12)
3. Haz clic en "Nueva Señal"
4. Busca errores en la consola
5. Busca la llamada a `/api/superadmin/properties`
6. Verifica la respuesta

**Resultado esperado:**
```json
{
  "success": true,
  "properties": [
    {
      "id": 25,
      "tenant_id": "...",
      "property_name": "Habitación 5",
      "tenant_name": "..."
    },
    ...
  ]
}
```

## 🔧 Posibles Causas y Soluciones

### Causa 1: Propiedades no están activas

**Solución:**
```sql
-- Verificar y activar propiedades inactivas
UPDATE tenant_properties 
SET is_active = true 
WHERE property_name LIKE 'Habitación%'
AND is_active = false;
```

### Causa 2: Error en la API

**Verificar:**
- Revisa los logs del servidor (Vercel)
- Verifica que la autenticación de SuperAdmin funcione
- Verifica que no haya errores de CORS

### Causa 3: Problema de autenticación

**Verificar:**
- ¿Estás logueado como SuperAdmin?
- ¿El token de autenticación es válido?
- ¿La sesión no ha expirado?

### Causa 4: Error en el frontend

**Verificar:**
- Abre la consola del navegador (F12)
- Busca errores de JavaScript
- Verifica que la llamada a la API se esté haciendo

## ✅ Solución Rápida

Si las propiedades existen pero no aparecen:

1. **Refresca la página** (Ctrl+R o Cmd+R)
2. **Cierra y vuelve a abrir el modal**
3. **Verifica en la consola** si hay errores
4. **Prueba en modo incógnito** para descartar problemas de caché

## 📞 Si Sigue Sin Funcionar

Comparte:
1. El resultado del query de verificación (paso 1)
2. El error de la consola del navegador (si hay)
3. La respuesta de la API `/api/superadmin/properties` (en Network tab)

Con esa información podremos identificar el problema exacto.

