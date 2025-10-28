# 🔍 Guía para Observar Envíos al MIR

Esta guía te ayudará a probar y observar si los formularios pendientes se pueden enviar correctamente al MIR.

## 📋 Tabla de Contenidos

1. [Configuración Previa](#configuración-previa)
2. [Verificar Variables de Entorno](#verificar-variables-de-entorno)
3. [Observar Logs en Tiempo Real](#observar-logs-en-tiempo-real)
4. [Probar la Conexión](#probar-la-conexión)
5. [Procesar Registros Pendientes](#procesar-registros-pendientes)
6. [Solución de Problemas](#solución-de-problemas)

---

## 1. Configuración Previa

### Variables de entorno necesarias:

```bash
MIR_BASE_URL=https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion
MIR_HTTP_USER=tu_usuario
MIR_HTTP_PASS=tu_contraseña
MIR_CODIGO_ARRENDADOR=tu_codigo_arrendador
MIR_APLICACION=Delfin_Check_in
```

### Verificar que están configuradas:

**En desarrollo local:**
```bash
cd delfin-checkin
cat .env.local | grep MIR
```

**En producción (Vercel):**
- Ve a: https://vercel.com/tu-proyecto/settings/environment-variables
- Verifica que todas las variables MIR_* estén configuradas

---

## 2. Verificar Variables de Entorno

### Opción A: Desde la interfaz web

1. Ir a: `http://localhost:3000/estado-envios-mir` (desarrollo) o `https://tu-dominio.com/estado-envios-mir` (producción)
2. Hacer clic en el botón **"🔍 Test Conexión"**
3. Observar el resultado en el mensaje que aparece

### Opción B: Desde terminal

```bash
curl -X POST http://localhost:3000/api/ministerio/test-conexion
```

**Resultado esperado si todo está bien:**
```json
{
  "success": true,
  "message": "✅ Conexión exitosa con el MIR",
  "resultado": {
    "ok": true,
    "lote": "...",
    ...
  }
}
```

**Si faltan variables:**
```json
{
  "success": false,
  "error": "Variables de entorno faltantes",
  "missingVars": ["MIR_HTTP_USER", "MIR_HTTP_PASS"]
}
```

---

## 3. Observar Logs en Tiempo Real

### En desarrollo local:

```bash
cd delfin-checkin
npm run dev
```

Los logs aparecerán en la terminal donde ejecutaste `npm run dev`.

### En producción (Vercel):

**Opción 1: Desde el dashboard de Vercel**
```
1. Ve a: https://vercel.com/tu-proyecto
2. Click en la pestaña "Logs"
3. Selecciona "Runtime Logs"
4. Filtra por "ministerio" para ver solo logs del MIR
```

**Opción 2: Desde terminal con Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel logs --follow
```

**Opción 3: Logs específicos del MIR**
```bash
vercel logs --follow | grep "MIR\|ministerio\|auto-envío"
```

### Logs importantes a buscar:

- `🚀 Auto-envío al MIR iniciado...` - Inicio del proceso
- `📋 Datos recibidos para auto-envío:` - Datos que se van a enviar
- `📤 Enviando datos al MIR:` - Justo antes de enviar
- `✅ Resultado del envío al MIR:` - Respuesta del MIR
- `❌ Error en auto-envío al MIR:` - Si hay algún error

---

## 4. Probar la Conexión

### Paso 1: Verificar credenciales

```bash
curl -X POST http://localhost:3000/api/ministerio/test-conexion | jq
```

o desde la interfaz: Click en **"🔍 Test Conexión"**

### Paso 2: Ver los logs en tiempo real

En otra terminal:
```bash
# Desarrollo local
tail -f logs/desarrollo.log  # Si tienes logging a archivo

# O simplemente observa la terminal donde corre npm run dev
```

### Paso 3: Interpretar resultados

**✅ Conexión exitosa:**
- Verás un mensaje verde: "✅ Conexión exitosa con el MIR"
- En los logs: `✅ Resultado del test de conexión: { ok: true, lote: ... }`

**❌ Error de credenciales:**
- Mensaje rojo con el error específico
- En los logs: `❌ Error en test de conexión: ...`
- **Solución:** Verificar variables de entorno

**❌ Error SSL:**
- Error: `unable to verify the first certificate`
- **Causa:** Certificados SSL del MIR
- **Solución:** Contactar al soporte técnico del MIR

---

## 5. Procesar Registros Pendientes

### Ver cuántos registros pendientes hay:

1. Ir a: `/estado-envios-mir`
2. Observar el contador en **"Pendientes"**
3. Ver la lista en la pestaña "Pendientes"

### Procesar todos los pendientes:

**Desde la interfaz web:**

1. Ve a: `/estado-envios-mir`
2. Click en **"🚀 Procesar Pendientes (X)"**
3. Confirma la acción
4. Observa el progreso en el mensaje de feedback
5. Espera a que termine (unos segundos por registro)

**Desde terminal (para ver logs detallados):**

```bash
# Asegúrate de tener los logs corriendo en otra terminal
curl -X POST http://localhost:3000/api/ministerio/procesar-pendientes \
  -H "Content-Type: application/json" | jq
```

### Logs del procesamiento:

Verás algo como:
```
🚀 Procesando registros pendientes al MIR...
📋 Encontrados 5 registros pendientes

📝 Procesando registro 1 (1/5)
📤 Enviando 2 viajeros al MIR...
📊 Resultado: { ok: true, lote: "..." }
✅ Registro 1 procesado exitosamente

📝 Procesando registro 2 (2/5)
...

✅ Procesamiento completado:
   Total: 5
   Exitosos: 4
   Errores: 1
```

### Ver resultados:

1. La página se actualizará automáticamente después de 3 segundos
2. Los contadores cambiarán:
   - **Pendientes:** Disminuirá
   - **Enviados:** Aumentará (si fueron exitosos)
   - **Errores:** Aumentará (si hubo errores)

---

## 6. Solución de Problemas

### Problema: "Variables de entorno faltantes"

**Solución:**
```bash
# 1. Verifica que exista el archivo .env.local
ls -la delfin-checkin/.env.local

# 2. Agrega las variables faltantes
nano delfin-checkin/.env.local

# 3. Reinicia el servidor
npm run dev
```

### Problema: "Error SSL: unable to verify the first certificate"

**Causa:** El servidor del MIR usa certificados SSL que Node.js no puede verificar.

**Soluciones:**

1. **Contactar al MIR:** Pedir que revisen sus certificados SSL
2. **Temporal (NO recomendado en producción):**
   ```javascript
   // En ministerio-client.ts
   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
   ```

### Problema: "Error 401: Unauthorized"

**Causa:** Credenciales incorrectas.

**Solución:**
1. Verificar `MIR_HTTP_USER` y `MIR_HTTP_PASS`
2. Contactar al soporte del MIR para verificar credenciales

### Problema: "Error 400: Bad Request"

**Causa:** Datos mal formateados.

**Solución:**
1. Revisar los logs para ver qué datos se están enviando
2. Verificar que todos los campos obligatorios estén presentes
3. Verificar formatos de fechas, códigos de país, etc.

### Problema: No aparecen registros pendientes

**Posibles causas:**
1. Todos los registros ya fueron enviados
2. Los registros no tienen el formato esperado

**Verificar:**
```bash
# Ver registros en la base de datos
curl http://localhost:3000/api/ministerio/estado-envios | jq
```

---

## 📊 Resumen del Flujo Completo

```
1. Usuario → Click en "Test Conexión"
   ↓
2. Sistema → Verifica variables de entorno
   ↓
3. Sistema → Intenta conectar con el MIR
   ↓
4. MIR → Responde con éxito o error
   ↓
5. Usuario → Ve el resultado en pantalla

6. Usuario → Click en "Procesar Pendientes"
   ↓
7. Sistema → Obtiene registros pendientes de la BD
   ↓
8. Sistema → Para cada registro:
   - Prepara datos en formato MIR
   - Envía al MIR
   - Guarda resultado en la BD
   ↓
9. Usuario → Ve el resumen del procesamiento
   ↓
10. Sistema → Actualiza la interfaz automáticamente
```

---

## 🎯 Comandos Rápidos

```bash
# Test de conexión
curl -X POST http://localhost:3000/api/ministerio/test-conexion | jq

# Procesar pendientes
curl -X POST http://localhost:3000/api/ministerio/procesar-pendientes | jq

# Ver estado de envíos
curl http://localhost:3000/api/ministerio/estado-envios | jq

# Ver logs en tiempo real (Vercel)
vercel logs --follow | grep -i "mir\|ministerio"

# Ver solo errores
vercel logs --follow | grep "❌"
```

---

## 📱 Accesos Rápidos

- **Dashboard de envíos:** `/estado-envios-mir`
- **Registros de formularios:** `/guest-registrations-dashboard`
- **Configuración MIR:** `/settings/mir`

---

## ✅ Checklist de Verificación

Antes de procesar registros pendientes, verifica:

- [ ] Variables de entorno configuradas
- [ ] Test de conexión exitoso
- [ ] Hay registros pendientes para procesar
- [ ] Los logs están visibles (desarrollo local)
- [ ] Tienes acceso a Vercel Logs (producción)

---

## 🆘 Contacto de Soporte

Si después de seguir esta guía sigues teniendo problemas:

1. Captura de pantalla del error
2. Copia los logs relevantes
3. Describe qué estabas intentando hacer
4. Contacta al equipo de desarrollo

---

**Última actualización:** 2025-10-12
**Versión:** 1.0

