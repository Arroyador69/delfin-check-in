# 🐬 Configuración MIR en Neon Database

## 📋 Resumen

Este documento explica cómo configurar y verificar que el sistema MIR esté funcionando correctamente con la base de datos de Neon en Vercel.

## 🗄️ Base de Datos: Neon Database

El sistema está configurado para usar **Neon Database** (PostgreSQL) a través de Vercel:

- **Conexión**: `@vercel/postgres` se conecta automáticamente usando `POSTGRES_URL`
- **Variables de entorno**: Se inyectan automáticamente desde Vercel
- **Consistencia**: Todos los datos se guardan en la misma base de datos de producción

## 🔧 Configuración Inicial

### 1. Crear Tablas MIR en Neon

```bash
# Ejecutar en Vercel (producción)
POST https://admin.delfincheckin.com/api/setup-mir-neon
```

**O desde el dashboard:**
1. Ir a [https://admin.delfincheckin.com/api/setup-mir-neon](https://admin.delfincheckin.com/api/setup-mir-neon)
2. Hacer clic en "Send" para ejecutar la configuración

### 2. Verificar Estado de las Tablas

```bash
# Verificar estado
GET https://admin.delfincheckin.com/api/setup-mir-neon
```

## 📊 Estructura de Tablas

### `mir_comunicaciones`
```sql
CREATE TABLE mir_comunicaciones (
    id SERIAL PRIMARY KEY,
    referencia VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(10) DEFAULT 'PV',
    estado VARCHAR(50) DEFAULT 'pendiente',
    lote VARCHAR(255),
    resultado TEXT,
    error TEXT,
    xml_enviado TEXT,
    xml_respuesta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `mir_configuraciones`
```sql
CREATE TABLE mir_configuraciones (
    id SERIAL PRIMARY KEY,
    propietario_id VARCHAR(255) NOT NULL UNIQUE,
    usuario VARCHAR(255) NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    codigo_arrendador VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL DEFAULT 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
    aplicacion VARCHAR(100) NOT NULL DEFAULT 'Delfin_Check_in',
    simulacion BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 Flujo Completo del Sistema

### 1. Formulario Público
- **URL**: [https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a](https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a)
- **Función**: Usuario completa datos de registro
- **Validación**: Códigos INE para españoles, ISO para extranjeros

### 2. Guardado en Neon
- **Tabla**: `guest_registrations`
- **Endpoint**: `/api/public/form/[slug]/submit`
- **Procesamiento**: `/api/registro-flex`

### 3. Envío Automático al MIR
- **Trigger**: Después de guardar en `guest_registrations`
- **Endpoint**: `/api/ministerio/auto-envio`
- **Cliente**: `MinisterioClientOfficial` (esquemas oficiales)

### 4. Almacenamiento de Resultado
- **Tabla**: `mir_comunicaciones`
- **Estados**: pendiente, enviado, confirmado, error, anulado
- **Datos**: XML enviado, XML respuesta, lote, errores

### 5. Panel de Administración
- **URL**: [https://admin.delfincheckin.com/admin/mir-comunicaciones](https://admin.delfincheckin.com/admin/mir-comunicaciones)
- **Funciones**: Ver comunicaciones, consultar estado, anular lotes

## 🧪 Verificación del Sistema

### 1. Verificar Integración Completa

```bash
# Verificar estado general
GET https://admin.delfincheckin.com/api/verificar-formulario-mir
```

### 2. Probar Envío de Prueba

```bash
# Crear registro de prueba
POST https://admin.delfincheckin.com/api/verificar-formulario-mir
```

### 3. Verificar Variables de Entorno

El sistema verifica automáticamente:
- ✅ `MIR_HTTP_USER` - Usuario MIR
- ✅ `MIR_HTTP_PASS` - Contraseña MIR  
- ✅ `MIR_CODIGO_ARRENDADOR` - Código de arrendador
- ✅ `MIR_BASE_URL` - URL del servicio MIR

## 🔐 Configuración de Credenciales MIR

### En Vercel Dashboard:
1. Ir a Settings → Environment Variables
2. Agregar variables MIR:
   ```bash
   MIR_HTTP_USER=tu_usuario_mir_real
   MIR_HTTP_PASS=tu_contraseña_mir_real
   MIR_CODIGO_ARRENDADOR=tu_codigo_arrendador_real
   MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
   ```

### En Panel de Configuración:
- **URL**: [https://admin.delfincheckin.com/settings/mir](https://admin.delfincheckin.com/settings/mir)
- **Función**: Configurar credenciales desde la interfaz
- **Verificación**: Probar conexión en tiempo real

## 📈 Monitoreo y Estadísticas

### Panel MIR
- **Comunicaciones enviadas**: Lista completa con estados
- **Estadísticas**: Total, pendientes, enviados, confirmados, errores, anulados
- **Seguimiento**: Estados en tiempo real sin necesidad de entrar al MIR

### Base de Datos
- **Índices optimizados**: Para consultas rápidas por estado, fecha, lote
- **Triggers automáticos**: Actualización de `updated_at`
- **Integridad**: Referencias únicas y validaciones

## 🚨 Solución de Problemas

### Error: "A relation mir_comunicaciones does not exist"
**Solución**: Ejecutar configuración de tablas
```bash
POST /api/setup-mir-neon
```

### Error: Variables de entorno faltantes
**Solución**: Configurar credenciales MIR en Vercel
```bash
# Verificar variables
GET /api/verificar-formulario-mir
```

### Error: Formulario no envía al MIR
**Solución**: Verificar integración completa
```bash
# Probar envío
POST /api/verificar-formulario-mir
```

## ✅ Checklist de Verificación

- [ ] Tablas MIR creadas en Neon Database
- [ ] Variables de entorno MIR configuradas
- [ ] Formulario público funcionando
- [ ] Envío automático al MIR activo
- [ ] Panel de administración accesible
- [ ] Comunicaciones visibles en panel
- [ ] Estados actualizándose correctamente

## 🎯 URLs Importantes

- **Formulario Público**: [https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a](https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a)
- **Panel MIR**: [https://admin.delfincheckin.com/admin/mir-comunicaciones](https://admin.delfincheckin.com/admin/mir-comunicaciones)
- **Configuración MIR**: [https://admin.delfincheckin.com/settings/mir](https://admin.delfincheckin.com/settings/mir)
- **Configurar Tablas**: [https://admin.delfincheckin.com/api/setup-mir-neon](https://admin.delfincheckin.com/api/setup-mir-neon)
- **Verificar Sistema**: [https://admin.delfincheckin.com/api/verificar-formulario-mir](https://admin.delfincheckin.com/api/verificar-formulario-mir)

## 🚀 Sistema Listo para Producción

Una vez completada la configuración, el sistema está listo para:

1. ✅ **Recibir registros** desde el formulario público
2. ✅ **Enviar automáticamente** al MIR con credenciales reales
3. ✅ **Seguir comunicaciones** en tiempo real
4. ✅ **Gestionar múltiples propietarios** (multitenant)
5. ✅ **Cumplir normativas** oficiales del MIR

**¡El sistema MIR está completamente integrado con Neon Database y listo para uso en producción!** 🎉
