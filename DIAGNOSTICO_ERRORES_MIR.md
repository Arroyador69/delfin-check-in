# 🔍 Diagnóstico de Errores en Comunicaciones MIR

## 📋 Problema Identificado

Cuando un formulario no se envía correctamente al MIR, se guarda en la base de datos con:
- **Estado**: `error`
- **Lote**: `null` (porque no hubo respuesta exitosa del MIR)
- **Error**: Mensaje descriptivo del problema

Esto puede deberse a varios factores que se analizan a continuación.

## 🛠️ Endpoint de Diagnóstico

He creado un endpoint de diagnóstico para investigar errores en comunicaciones MIR:

### Uso

```
GET /api/debug/diagnostico-error-mir?referencia=93db4d01-62d3-4ee4-8679-061db8fac0a5
```

O para buscar por fecha:

```
GET /api/debug/diagnostico-error-mir?fecha=2025-11-20
```

O para ver todos los errores recientes:

```
GET /api/debug/diagnostico-error-mir
```

### Respuesta

El endpoint devuelve:
- Detalles completos de la comunicación (error, resultado, XMLs)
- Configuración MIR del tenant
- Análisis automático de posibles causas
- Previsualización de los XMLs enviados y respuestas recibidas

## 🔧 Corrección Aplicada

Se ha corregido el guardado de errores en `/api/ministerio/auto-envio-dual` para que capture correctamente los mensajes de error, ya que pueden venir en diferentes campos:
- `error`: Para excepciones capturadas
- `descripcion`: Para errores parseados del MIR
- `message`: Para errores genéricos

## 🔍 Posibles Causas de Error

### 1. Problemas de Conectividad
- **Síntomas**: Error `TIMEOUT`, `NETWORK_ERROR`, o `fetch failed`
- **Causa**: Problemas de red o el servidor MIR no está disponible
- **Solución**: Verificar conectividad con el servidor MIR

### 2. Errores de Autenticación
- **Síntomas**: Error HTTP 401 o 403, o mensajes sobre credenciales
- **Causa**: Credenciales MIR incorrectas o expiradas
- **Solución**: Revisar y actualizar las credenciales en `mir_configuraciones`

### 3. Errores HTTP del Servidor MIR
- **Síntomas**: Errores HTTP 4xx o 5xx
- **Causa**: Problema en el servidor MIR o configuración incorrecta
- **Solución**: Revisar la configuración (URL, códigos de establecimiento, etc.)

### 4. Errores de Validación XML
- **Síntomas**: Errores sobre XML, validación, o schema
- **Causa**: Datos incompletos o incorrectos en el formulario
- **Solución**: Revisar que todos los campos obligatorios estén correctamente completados

### 5. Sin Respuesta del MIR
- **Síntomas**: Estado `error` sin respuesta XML
- **Causa**: Timeout o caída del servicio MIR
- **Solución**: Verificar el estado del servicio MIR y reintentar el envío

## 📊 Consultar Error Específico

Para investigar el caso específico de la referencia `93db4d01-62d3-4ee4-8679-061db8fac0a5`:

1. Acceder al endpoint de diagnóstico:
   ```
   https://admin.delfincheckin.com/api/debug/diagnostico-error-mir?referencia=93db4d01-62d3-4ee4-8679-061db8fac0a5
   ```

2. Revisar los campos:
   - `error`: Mensaje de error específico
   - `resultado`: Resultado completo del envío (JSON)
   - `xml_respuesta_preview`: Respuesta del servidor MIR (si hubo)
   - `xml_enviado_preview`: XML que se intentó enviar

3. Analizar el diagnóstico:
   - `posibles_causas`: Lista de posibles causas identificadas automáticamente
   - `configuracion_mir`: Configuración MIR del tenant para verificar credenciales

## 🔄 Reintentar Envío

Si el error fue temporal (conectividad, timeout), puedes:

1. **Desde el admin**: Ir a la página de comunicaciones MIR y usar el botón "Reenviar" si está disponible

2. **Manualmente**: Si conoces la referencia, puedes intentar reenviar desde la base de datos actualizando el estado a `pendiente` y disparando el proceso de envío nuevamente

## 📝 Notas Importantes

- Los errores se guardan en `mir_comunicaciones` con toda la información disponible
- El campo `resultado` contiene el resultado completo en JSON, incluyendo códigos de error del MIR
- El campo `xml_respuesta` contiene la respuesta completa del servidor MIR (si hubo respuesta)
- El campo `error` contiene un mensaje legible del error (ahora corregido para capturar correctamente todos los tipos de error)

## 🐛 Debug

Si necesitas más información, revisa:
- Los logs del servidor Vercel para el momento del envío
- La configuración MIR en la tabla `mir_configuraciones`
- La respuesta XML del servidor MIR (si está disponible en `xml_respuesta`)

