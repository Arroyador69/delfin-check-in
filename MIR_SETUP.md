# Configuración MIR - Ministerio del Interior

## Credenciales configuradas
- **Usuario**: 27380387Z
- **Contraseña**: Marazulado_
- **Código Arrendador**: 0000146962
- **Aplicación**: Delfin_Check_in
- **Código Establecimiento**: 0000256653

## ✅ URLs del MIR configuradas
**URLs oficiales del Ministerio del Interior:**

| Entorno | URL |
|---------|-----|
| **Pruebas** | `https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion` |
| **Producción** | `https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion` |

Actualmente configurado para **entorno de pruebas**.

## Cómo probar (modo simulación)

### 1. Test de envío (Alta A)
```bash
curl -X POST http://localhost:3000/api/ministerio/test-envio
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Test de envío MIR completado",
  "config": {
    "simulacion": true,
    "codigoArrendador": "0000146962",
    "aplicacion": "Delfin_Check_in"
  },
  "resultado": {
    "ok": true,
    "codigo": "0",
    "descripcion": "Ok",
    "lote": "SIM-1690000000000"
  }
}
```

### 2. Test de consulta de lote
```bash
curl -X POST http://localhost:3000/api/ministerio/test-consulta \
  -H "Content-Type: application/json" \
  -d '{"lotes": ["SIM-TEST-001"]}'
```

Respuesta esperada:
```json
{
  "success": true,
  "resultado": {
    "ok": true,
    "codigo": "0",
    "descripcion": "Ok",
    "resultados": [{
      "lote": "SIM-TEST-001",
      "codigoEstado": "1",
      "resultadoComunicaciones": [{
        "indice": 1,
        "codigoComunicacion": "PV-1690000000000"
      }]
    }]
  }
}
```

## Flujo de confirmación

### 1. Envío inicial (Operación A)
- Envías datos → Recibes `lote` si `codigo=0`
- Si `codigo≠0`, hay error de formato/cabecera

### 2. Verificación periódica (Consulta de lote)
- Consultas el `lote` cada X minutos
- Estados del lote:
  - `1`: Tramitado sin errores ✅
  - `6`: Tramitado con errores parciales ⚠️
  - `4/5`: En proceso/pendiente (seguir consultando)

### 3. Confirmación final
- Cuando `codigoEstado=1`, cada comunicación tiene un `codigoComunicacion`
- Este `codigoComunicacion` es la confirmación de inserción exitosa

## Cómo probar con el MIR REAL

### Test de envío real (entorno de pruebas)
```bash
curl -X POST http://localhost:3000/api/ministerio/test-real \
  -H "Content-Type: application/json" \
  -d '{"entorno": "pruebas"}'
```

### Test de envío real (entorno de producción)
```bash
curl -X POST http://localhost:3000/api/ministerio/test-real \
  -H "Content-Type: application/json" \
  -d '{"entorno": "produccion"}'
```

## Para activar en producción

1. Actualizar `.env.local`:
   ```
   MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
   MIR_SIMULACION=false
   ```
2. Probar con datos reales usando el endpoint `test-real`

## ⚠️ Estado actual: Certificado SSL requerido

**Problema identificado**: Error `unable to verify the first certificate`

**Solución**: Necesitas obtener el certificado SSL del MIR. Ver archivo `CERTIFICADO_MIR.md` para instrucciones detalladas.

### Diagnóstico de conectividad
```bash
curl -X GET http://localhost:3000/api/ministerio/diagnostico
```

## Códigos de error comunes
- `10111`: Error de autenticación
- `10130`: Error en formato XML
- `10131`: Error en compresión ZIP/Base64
- `10103`: Código arrendador inválido
- `10107`: Aplicación inválida

## Integración con formularios
Los endpoints están listos para recibir el mismo formato que ya usas:
- `POST /api/ministerio/envio` → Envía al MIR
- `POST /api/ministerio/consulta-lote` → Consulta estado
- `GET /api/ministerio/diagnostico` → Diagnóstico de conectividad

## Catálogos
Si el MIR proporciona operación `catalogo`, la implementaremos para obtener códigos válidos de:
- Tipos de documento (NIF, NIE, PAS, etc.)
- Tipos de pago (EFECT, TARJT, etc.)
- Códigos de municipios INE

## 📞 Próximos pasos
1. **Contactar MIR** para obtener certificado SSL
2. **Configurar certificado** según `CERTIFICADO_MIR.md`
3. **Probar conectividad** con endpoint de diagnóstico
4. **Activar envíos reales** una vez verificado
