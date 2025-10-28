# 🏨 Guía del Cliente - Configuración MIR

## 📋 Introducción

Esta guía te ayudará a configurar correctamente tu sistema para enviar comunicaciones al Ministerio del Interior (MIR) de España. El sistema está diseñado para ser **multitenant**, lo que significa que múltiples propietarios pueden usar la misma plataforma con sus propias credenciales.

## 🎯 ¿Qué es el MIR?

El **MIR (Ministerio del Interior)** requiere que todos los establecimientos de hospedaje envíen información sobre sus huéspedes. Esto incluye:

- ✅ **Partes de Viajeros (PV)**: Información de cada huésped
- ✅ **Reservas de Hospedaje (RH)**: Información de las reservas
- ✅ **Alquileres de Vehículos (AV)**: Si alquilas vehículos
- ✅ **Reservas de Vehículos (RV)**: Si tienes reservas de vehículos

## 🔑 Paso 1: Obtener Credenciales MIR

### 1.1 Registro en el MIR

1. **Accede al portal del MIR**: [https://hospedajes.ses.mir.es](https://hospedajes.ses.mir.es)
2. **Registra tu establecimiento** como proveedor de hospedaje
3. **Marca la casilla** "Envío de comunicaciones por servicio web" ⚠️ **MUY IMPORTANTE**
4. **Completa el registro** con todos los datos de tu establecimiento

### 1.2 Obtener Credenciales

Después del registro, el MIR te proporcionará:

- **Usuario**: Tu CIF/NIF/NIE seguido de `---WS` (ejemplo: `B12345678---WS`)
- **Contraseña**: Una contraseña generada por el MIR
- **Código de Arrendador**: Un código único asignado a tu establecimiento

### 1.3 Verificar Credenciales

Puedes consultar y modificar estas credenciales desde:
- **Portal MIR** → **Acceso al registro de establecimientos y entidades** → **Servicio de comunicación**

## ⚙️ Paso 2: Configurar en la Plataforma

### 2.1 Acceder al Panel de Administración

1. **Inicia sesión** en tu cuenta de la plataforma
2. **Ve a Configuración** → **Integración MIR**
3. **O accede directamente** a `/admin/mir-comunicaciones`

### 2.2 Configurar Credenciales

En el panel de configuración, introduce:

```
Usuario MIR: TU_CIF---WS
Contraseña: tu_contraseña_del_mir
Código de Arrendador: tu_codigo_asignado
```

### 2.3 Verificar Conexión

1. **Haz clic en "Verificar Conexión"**
2. **El sistema probará** la conexión con el MIR
3. **Si es exitosa**, verás: ✅ "Conexión exitosa con el MIR"

## 🧪 Paso 3: Realizar Pruebas

### 3.1 Envío de Prueba

1. **Ve a la pestaña "Envío de Prueba"**
2. **Completa los datos** de un huésped de prueba
3. **Haz clic en "Enviar Comunicación"**
4. **Verifica el resultado** en la respuesta

### 3.2 Consultar Catálogos

1. **Ve a la pestaña "Catálogos"**
2. **Consulta los catálogos disponibles**:
   - `TIPOS_DOCUMENTO` - Tipos de documento válidos
   - `TIPOS_PAGO` - Tipos de pago aceptados
   - `PAISES` - Códigos de países
   - `MUNICIPIOS` - Códigos de municipios

### 3.3 Verificar Estados

1. **Ve a la pestaña "Comunicaciones"**
2. **Revisa el estado** de tus envíos
3. **Descarga XML** si necesitas verificar el contenido

## 🚀 Paso 4: Configuración para Producción

### 4.1 Variables de Entorno (Para Administradores)

Si eres administrador de la plataforma, configura estas variables:

```bash
# Credenciales MIR (OBLIGATORIAS)
MIR_HTTP_USER=TU_CIF---WS
MIR_HTTP_PASS=tu_contraseña_real
MIR_CODIGO_ARRENDADOR=tu_codigo_real

# URL del servicio MIR
MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion

# Configuración opcional
MIR_APLICACION=Delfin_Check_in
MIR_SIMULACION=false
```

### 4.2 Sistema Multitenant

Para múltiples propietarios, cada uno tendrá:

- **Sus propias credenciales** MIR
- **Su propio panel** de administración
- **Aislamiento completo** de datos
- **Configuración independiente**

## 📊 Paso 5: Monitoreo y Gestión

### 5.1 Panel de Administración

Accede a `/admin/mir-comunicaciones` para:

- ✅ **Ver todas las comunicaciones** enviadas
- ✅ **Enviar comunicaciones** de prueba
- ✅ **Consultar estados** de comunicaciones
- ✅ **Consultar catálogos** MIR
- ✅ **Anular lotes** si es necesario
- ✅ **Descargar XML** enviado y respuestas

### 5.2 Estados de Comunicación

- 🟢 **Enviado**: Comunicación enviada correctamente
- 🔴 **Error**: Error en el envío (revisar logs)
- 🟡 **Pendiente**: En proceso de envío
- ⚫ **Anulado**: Comunicación cancelada

### 5.3 Logs y Debugging

- **Logs detallados** de cada operación
- **XML enviado** y respuestas recibidas
- **Códigos de error** con descripciones
- **Trazabilidad completa** de cada comunicación

## 🔧 Paso 6: Resolución de Problemas

### 6.1 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Error de autenticación` | Credenciales incorrectas | Verificar usuario y contraseña |
| `Error de formato` | Datos inválidos | Consultar catálogos para códigos válidos |
| `Error de conexión` | Problema de red | Verificar conectividad con MIR |
| `Error de validación` | Datos incompletos | Revisar campos obligatorios |

### 6.2 Verificaciones

1. **Credenciales correctas**: Usuario debe terminar en `---WS`
2. **Códigos válidos**: Usar códigos de los catálogos MIR
3. **Formato de fechas**: `YYYY-MM-DD` para fechas
4. **Códigos INE**: 5 dígitos para municipios
5. **Países**: Códigos ISO 3166-1 Alpha-3 (3 letras)

### 6.3 Soporte

Si tienes problemas:

1. **Revisa los logs** en el panel de administración
2. **Verifica la configuración** de credenciales
3. **Consulta los catálogos** para códigos válidos
4. **Contacta al soporte técnico** con los logs de error

## 📚 Recursos Adicionales

### Documentación Técnica

- `IMPLEMENTACION_MIR_OFICIAL.md` - Documentación técnica completa
- `CONFIGURACION_MULTITENANT_MIR.md` - Configuración multitenant
- `VARIABLES_ENTORNO_MIR_LIMPIEZA.md` - Limpieza de variables

### Enlaces Útiles

- [Portal MIR](https://hospedajes.ses.mir.es)
- [Documentación oficial MIR](https://hospedajes.ses.mir.es/documentacion)
- [Catálogos MIR](https://hospedajes.ses.mir.es/catalogos)

## ✅ Checklist Final

Antes de usar el sistema en producción:

- [ ] ✅ Credenciales MIR obtenidas y verificadas
- [ ] ✅ Conexión con MIR probada exitosamente
- [ ] ✅ Envío de prueba realizado correctamente
- [ ] ✅ Catálogos consultados y códigos verificados
- [ ] ✅ Panel de administración funcionando
- [ ] ✅ Logs y monitoreo configurados
- [ ] ✅ Equipo entrenado en el uso del sistema

---

**¡Listo!** Tu sistema está configurado para enviar comunicaciones al MIR de manera automática y confiable. 🎉

