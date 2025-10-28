# 🧹 Limpieza de Variables de Entorno MIR

## Variables que DEBES MANTENER (Obligatorias)

### ✅ Variables Esenciales para el Sistema MIR Oficial

```bash
# Credenciales MIR (OBLIGATORIAS - las correctas que has obtenido)
MIR_HTTP_USER=tu_usuario_correcto  # CIF/NIF/NIE---WS
MIR_HTTP_PASS=tu_contraseña_correcta
MIR_CODIGO_ARRENDADOR=tu_codigo_arrendador

# URL del servicio MIR (por defecto producción)
MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion

# Configuración opcional
MIR_APLICACION=Delfin_Check_in
MIR_SIMULACION=false
```

## Variables que PUEDES ELIMINAR (Innecesarias)

### ❌ Variables de Relleno/Pruebas que NO sirven

```bash
# ELIMINAR ESTAS - Son de pruebas anteriores que no funcionan
MIR_SOAP_ACTION=          # ❌ No se usa en la implementación oficial
MIR_SOAP_OPERATION=       # ❌ No se usa en la implementación oficial  
MIR_SOAP_NAMESPACE=       # ❌ No se usa en la implementación oficial
MIR_SOAP_STYLE=           # ❌ No se usa en la implementación oficial
```

### 🔍 Explicación de por qué se pueden eliminar:

1. **MIR_SOAP_ACTION**: No se usa porque el sistema oficial usa el namespace correcto automáticamente
2. **MIR_SOAP_OPERATION**: No se usa porque las operaciones están hardcodeadas según el WSDL oficial
3. **MIR_SOAP_NAMESPACE**: No se usa porque usamos el namespace oficial fijo: `http://www.soap.servicios.hospedajes.mir.es/comunicacion`
4. **MIR_SOAP_STYLE**: No se usa porque el estilo SOAP está definido en el WSDL oficial

## Variables que PUEDES MANTENER (Opcionales)

### ⚙️ Variables de Configuración Opcionales

```bash
# Estas son opcionales pero útiles para debugging
MIR_DEBUG_SOAP=false      # Para ver logs detallados de SOAP
MIR_SIMULACION=false      # Para modo simulación (testing)
```

## 🎯 Configuración Final Recomendada

### Para Producción:
```bash
MIR_HTTP_USER=TU_CIF---WS
MIR_HTTP_PASS=tu_contraseña_real
MIR_CODIGO_ARRENDADOR=tu_codigo_real
MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
MIR_APLICACION=Delfin_Check_in
MIR_SIMULACION=false
```

### Para Testing/Desarrollo:
```bash
MIR_HTTP_USER=TU_CIF---WS
MIR_HTTP_PASS=tu_contraseña_real
MIR_CODIGO_ARRENDADOR=tu_codigo_real
MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
MIR_APLICACION=Delfin_Check_in
MIR_SIMULACION=true
MIR_DEBUG_SOAP=true
```

## 🚀 Pasos para Limpiar Variables

1. **Eliminar variables innecesarias** de Vercel:
   - `MIR_SOAP_ACTION`
   - `MIR_SOAP_OPERATION`
   - `MIR_SOAP_NAMESPACE`
   - `MIR_SOAP_STYLE`

2. **Verificar que las variables esenciales** estén configuradas:
   - `MIR_HTTP_USER`
   - `MIR_HTTP_PASS`
   - `MIR_CODIGO_ARRENDADOR`
   - `MIR_BASE_URL`

3. **Configurar variables opcionales** según necesidad:
   - `MIR_SIMULACION=false` (para producción)
   - `MIR_DEBUG_SOAP=false` (para producción)

## 📋 Verificación Post-Limpieza

Después de limpiar las variables, verifica que:

1. ✅ El sistema compila sin errores
2. ✅ El panel de administración funciona: `/admin/mir-comunicaciones`
3. ✅ Las pruebas de conexión MIR funcionan
4. ✅ El envío de comunicaciones funciona correctamente

## 🔧 Para Sistema Multitenant

Si implementas el sistema multitenant, cada propietario tendrá sus propias credenciales en la base de datos, no en variables de entorno globales. Las variables de entorno solo serían para:

- Configuración global del sistema
- Credenciales de administrador
- URLs base del servicio MIR

