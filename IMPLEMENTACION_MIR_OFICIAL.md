# Implementación MIR Oficial v3.1.3

## Resumen de Cambios

Se ha implementado un sistema completo de comunicación con el MIR siguiendo estrictamente la documentación oficial v3.1.3 proporcionada. El sistema incluye:

### ✅ Funcionalidades Implementadas

1. **Cliente MIR Oficial** (`ministerio-client-official.ts`)
   - Implementa estrictamente los esquemas WSDL/XSD oficiales
   - Soporte para todas las operaciones: Alta, Consulta, Anulación, Catálogos
   - Namespace correcto: `http://www.soap.servicios.hospedajes.mir.es/comunicacion`
   - Estructura SOAP correcta según `comunicacion.wsdl`
   - Proceso XML/ZIP/Base64 según documentación oficial

2. **Generador XML Oficial** (`mir-xml-official.ts`)
   - Basado en `altaParteHospedaje.xsd` y `tiposGenerales.xsd`
   - Validaciones estrictas según esquemas oficiales
   - Soporte completo para `personaHospedajeType` y `contratoHospedajeType`

3. **Endpoints API Mejorados**
   - `/api/ministerio/envio-oficial` - Envío con esquemas oficiales
   - `/api/ministerio/consulta-oficial` - Consulta de comunicaciones
   - `/api/ministerio/anulacion-oficial` - Anulación de lotes
   - `/api/ministerio/catalogo-oficial` - Consulta de catálogos MIR
   - `/api/ministerio/comunicaciones` - Listado de comunicaciones

4. **Panel de Administración** (`/admin/mir-comunicaciones`)
   - Gestión completa de comunicaciones
   - Envío de pruebas
   - Consulta de estados
   - Consulta de catálogos MIR
   - Anulación de lotes
   - Seguimiento en tiempo real

## Configuración de Credenciales

### Variables de Entorno Requeridas

```bash
# Credenciales MIR (OBLIGATORIAS)
MIR_HTTP_USER=tu_usuario_correcto
MIR_HTTP_PASS=tu_contraseña_correcta
MIR_CODIGO_ARRENDADOR=tu_codigo_arrendador

# URL del servicio (por defecto producción)
MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion

# Configuración opcional
MIR_APLICACION=Delfin_Check_in
MIR_SIMULACION=false
MIR_DEBUG_SOAP=false
```

### ⚠️ Importante: Credenciales Correctas

Las credenciales que tenías anteriormente **NO eran las correctas**. Ahora debes usar las credenciales reales que has obtenido del MIR.

**Según la documentación oficial:**
- El usuario suele ser tu CIF/NIF/NIE seguido de '---WS'
- La contraseña se obtiene al marcar "Envío de comunicaciones por servicio web" durante el registro
- Puedes consultar y modificar estas credenciales desde la opción 'Servicio de comunicación' dentro de 'Acceso al registro de establecimientos y entidades'

## Estructura de Datos Según Esquemas Oficiales

### Tipos de Comunicación
- **RH**: Reserva de Hospedaje
- **AV**: Alta de Viajero  
- **PV**: Parte de Viajero (implementado)
- **RV**: Reserva de Vehículo

### Roles de Persona
- **VI**: Viajero
- **CP**: Contacto Principal
- **CS**: Contacto Secundario
- **TI**: Titular

### Validaciones Implementadas

#### Código de Municipio
- Debe tener exactamente 5 dígitos según INE
- Formato: `28079` (Madrid)

#### Código de País
- ISO 3166-1 Alpha-3
- Formato: `ESP` (España)

#### Fechas
- Contrato: `YYYY-MM-DD`
- Entrada/Salida: `YYYY-MM-DDTHH:mm:ss`

#### Documentos
- Número máximo 15 caracteres
- Soporte máximo 9 caracteres

## Uso del Sistema

### 1. Envío de Comunicación

```typescript
// Datos de ejemplo según esquemas oficiales
const datosMIR = {
  codigoEstablecimiento: "0000256653",
  contrato: {
    referencia: "REF-2024-001",
    fechaContrato: "2024-01-15",
    fechaEntrada: "2024-01-15T14:00:00",
    fechaSalida: "2024-01-16T12:00:00",
    numPersonas: 1,
    numHabitaciones: 1,
    internet: false,
    pago: {
      tipoPago: "EFECT",
      fechaPago: "2024-01-15"
    }
  },
  personas: [{
    rol: "VI",
    nombre: "Juan",
    apellido1: "Pérez",
    apellido2: "García",
    tipoDocumento: "NIF",
    numeroDocumento: "12345678Z",
    fechaNacimiento: "1985-01-01",
    nacionalidad: "ESP",
    sexo: "M",
    direccion: {
      direccion: "Calle Ejemplo 123",
      codigoPostal: "28001",
      pais: "ESP",
      codigoMunicipio: "28079",
      nombreMunicipio: "Madrid"
    },
    telefono: "600000000",
    correo: "juan.perez@example.com"
  }]
};
```

### 2. Consulta de Comunicaciones

```typescript
// Consultar múltiples códigos
const codigos = ["CODIGO1", "CODIGO2", "CODIGO3"];
const resultado = await client.consultaComunicacion({ codigos });
```

### 3. Anulación de Lote

```typescript
// Anular lote completo
const resultado = await client.anulacionLote({ lote: "LOTE123" });
```

### 4. Consulta de Catálogos

```typescript
// Consultar catálogos MIR (tipos de documento, tipos de pago, etc.)
const resultado = await client.consultaCatalogo({ catalogo: "TIPOS_DOCUMENTO" });
```

**Catálogos disponibles:**
- `TIPOS_DOCUMENTO` - Tipos de documento de identidad
- `TIPOS_PAGO` - Tipos de pago aceptados
- `PAISES` - Códigos de países ISO 3166-1 Alpha-3
- `MUNICIPIOS` - Códigos de municipios según INE
- `TIPOS_VEHICULO` - Tipos de vehículos para alquiler
- `COLORES_VEHICULO` - Colores de vehículos
- `CATEGORIAS_VEHICULO` - Categorías de vehículos
- `ROLES_PERSONA` - Roles de persona en las comunicaciones

## Panel de Administración

Accede a `/admin/mir-comunicaciones` para:

1. **Ver todas las comunicaciones** enviadas
2. **Enviar comunicación de prueba** con datos válidos
3. **Consultar estado** de comunicaciones específicas
4. **Consultar catálogos MIR** (tipos de documento, tipos de pago, etc.)
5. **Anular lotes** si es necesario
6. **Descargar XML** enviado y respuestas

## Diferencias con Implementación Anterior

### ❌ Problemas Corregidos

1. **Namespace incorrecto**: Antes usaba `http://www.mir.es/hospedajes-web/ws/v1`, ahora usa el oficial
2. **Estructura SOAP incorrecta**: Antes usaba `peticion`, ahora usa `comunicacionRequest`
3. **Validaciones faltantes**: Ahora valida todos los campos según XSD
4. **Falta de consulta/anulación**: Ahora implementa todas las operaciones
5. **Credenciales incorrectas**: Ahora usa las credenciales reales

### ✅ Mejoras Implementadas

1. **Cumplimiento estricto** de documentación oficial
2. **Validaciones completas** según esquemas XSD
3. **Manejo de errores** mejorado
4. **Panel de administración** completo
5. **Seguimiento de estados** en tiempo real
6. **Soporte para todas las operaciones** MIR
7. **Consulta de catálogos** para obtener tablas maestras
8. **Proceso XML/ZIP/Base64** según especificación oficial

## Testing

### Modo Simulación

Para pruebas sin enviar al MIR real:

```bash
MIR_SIMULACION=true
```

### Debug SOAP

Para ver el XML SOAP enviado:

```bash
MIR_DEBUG_SOAP=true
```

## Monitoreo y Logs

El sistema registra:
- ✅ Envíos exitosos con lote asignado
- ❌ Errores con descripción detallada
- 📋 XML enviado y respuestas recibidas
- 🔍 Consultas de estado
- 🚫 Anulaciones realizadas

## Próximos Pasos

1. **Configurar credenciales reales** en variables de entorno
2. **Probar envío de prueba** desde el panel de administración
3. **Verificar recepción** en el MIR
4. **Configurar monitoreo** de comunicaciones
5. **Entrenar al equipo** en el uso del panel

## Soporte

Para cualquier problema:
1. Revisar logs en consola del navegador
2. Verificar variables de entorno
3. Comprobar conectividad con MIR
4. Usar modo simulación para pruebas

---

**Nota**: Esta implementación sigue estrictamente la documentación oficial MIR v3.1.3 y debe garantizar el envío exitoso de comunicaciones.
