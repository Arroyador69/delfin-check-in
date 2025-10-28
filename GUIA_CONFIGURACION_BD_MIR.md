# 🐬 Guía de Configuración Base de Datos MIR

## 📋 Resumen

Esta guía te explica paso a paso cómo configurar las tablas MIR en tu base de datos de Neon, respetando las tablas que ya tienes.

## ✅ **SÍ, el formulario está completamente conectado al MIR**

### 🔄 **Flujo Completo del Sistema:**

1. **Usuario completa formulario** → [https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a](https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a)
2. **Datos se guardan** → `guest_registrations` (Neon Database)
3. **Sistema envía automáticamente** → MIR con esquemas oficiales
4. **Resultado se guarda** → `mir_comunicaciones` (Neon Database)
5. **Usuario ve estado** → Panel MIR en tiempo real

### 🏛️ **Cumplimiento Normas Oficiales MIR:**
- ✅ **Esquemas oficiales**: WSDL/XSD v3.1.3
- ✅ **Códigos INE**: Para españoles (automático)
- ✅ **Códigos ISO**: Para extranjeros (Alpha-3)
- ✅ **Validaciones estrictas**: Según normativa RD 933/2021
- ✅ **Cliente oficial**: `MinisterioClientOfficial`

## 🗄️ **Configuración de Base de Datos**

### **Opción 1: Desde el Dashboard (RECOMENDADO)**

1. **Ir a la URL de configuración:**
   ```
   https://admin.delfincheckin.com/api/setup-mir-neon
   ```

2. **Hacer clic en "Send"** para ejecutar la configuración automática

3. **Verificar que se crearon las tablas:**
   ```
   https://admin.delfincheckin.com/api/setup-mir-neon
   ```

### **Opción 2: Desde Neon Dashboard**

1. **Ir a tu proyecto en Neon:**
   ```
   https://console.neon.tech
   ```

2. **Abrir SQL Editor**

3. **Copiar y pegar el contenido de:**
   ```
   database/setup-mir-tablas.sql
   ```

4. **Ejecutar el script**

### **Opción 3: Desde Terminal (si tienes psql)**

```bash
# Conectar a tu base de datos Neon
psql "tu_postgres_url_de_neon"

# Ejecutar el script
\i database/setup-mir-tablas.sql
```

## 📊 **Tablas que se van a crear:**

### 1. `mir_comunicaciones`
```sql
-- Almacena las comunicaciones enviadas al MIR
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

### 2. `mir_configuraciones`
```sql
-- Configuraciones MIR para sistema multitenant
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

### 3. `guest_registrations` (verificar si existe)
```sql
-- Esta tabla ya debería existir, pero se verifica
CREATE TABLE IF NOT EXISTS guest_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reserva_ref VARCHAR(255),
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🧪 **Verificación del Sistema**

### 1. **Verificar que las tablas se crearon:**
```
GET https://admin.delfincheckin.com/api/setup-mir-neon
```

### 2. **Verificar integración completa:**
```
GET https://admin.delfincheckin.com/api/verificar-formulario-mir
```

### 3. **Probar envío de prueba:**
```
POST https://admin.delfincheckin.com/api/verificar-formulario-mir
```

## 🔐 **Configuración de Credenciales MIR**

### **En Vercel Dashboard:**
1. Ir a Settings → Environment Variables
2. Agregar estas variables:
   ```bash
   MIR_HTTP_USER=tu_usuario_mir_real
   MIR_HTTP_PASS=tu_contraseña_mir_real
   MIR_CODIGO_ARRENDADOR=tu_codigo_arrendador_real
   MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
   ```

### **En Panel de Configuración:**
- **URL**: [https://admin.delfincheckin.com/settings/mir](https://admin.delfincheckin.com/settings/mir)
- **Función**: Configurar credenciales desde la interfaz

## 🎯 **URLs Importantes del Sistema**

- **Formulario Público**: [https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a](https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a)
- **Panel MIR**: [https://admin.delfincheckin.com/admin/mir-comunicaciones](https://admin.delfincheckin.com/admin/mir-comunicaciones)
- **Configuración MIR**: [https://admin.delfincheckin.com/settings/mir](https://admin.delfincheckin.com/settings/mir)
- **Configurar Tablas**: [https://admin.delfincheckin.com/api/setup-mir-neon](https://admin.delfincheckin.com/api/setup-mir-neon)
- **Verificar Sistema**: [https://admin.delfincheckin.com/api/verificar-formulario-mir](https://admin.delfincheckin.com/api/verificar-formulario-mir)

## ✅ **Checklist de Verificación**

- [ ] Tablas MIR creadas en Neon Database
- [ ] Variables de entorno MIR configuradas
- [ ] Formulario público funcionando
- [ ] Envío automático al MIR activo
- [ ] Panel de administración accesible
- [ ] Comunicaciones visibles en panel
- [ ] Estados actualizándose correctamente

## 🚨 **Solución de Problemas**

### **Error: "A relation mir_comunicaciones does not exist"**
**Solución**: Ejecutar configuración de tablas
```
POST https://admin.delfincheckin.com/api/setup-mir-neon
```

### **Error: Variables de entorno faltantes**
**Solución**: Configurar credenciales MIR en Vercel
```
GET https://admin.delfincheckin.com/api/verificar-formulario-mir
```

### **Error: Formulario no envía al MIR**
**Solución**: Verificar integración completa
```
POST https://admin.delfincheckin.com/api/verificar-formulario-mir
```

## 🚀 **Sistema Listo para Producción**

Una vez completada la configuración, el sistema está listo para:

1. ✅ **Recibir registros** desde el formulario público
2. ✅ **Enviar automáticamente** al MIR con credenciales reales
3. ✅ **Seguir comunicaciones** en tiempo real
4. ✅ **Gestionar múltiples propietarios** (multitenant)
5. ✅ **Cumplir normativas** oficiales del MIR

**¡El sistema MIR está completamente integrado y listo para uso en producción!** 🎉

## 📞 **Soporte**

Si tienes algún problema:
1. Verificar logs en Vercel Dashboard
2. Revisar variables de entorno
3. Ejecutar endpoints de verificación
4. Consultar documentación en `CONFIGURACION_MIR_NEON.md`
