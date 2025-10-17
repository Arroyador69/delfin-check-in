# Configuración Multitenant MIR - Guía para Propietarios

## 🏢 Sistema Multitenant para Múltiples Propietarios

Este sistema está diseñado para permitir que múltiples propietarios de establecimientos de hospedaje utilicen la misma plataforma para enviar comunicaciones al MIR, cada uno con sus propias credenciales.

## 🔧 Configuración por Propietario

### Variables de Entorno por Propietario

Cada propietario debe configurar sus propias credenciales MIR en las variables de entorno:

```bash
# Credenciales MIR del Propietario (OBLIGATORIAS)
MIR_HTTP_USER=PROPIETARIO1_CIF---WS
MIR_HTTP_PASS=contraseña_del_propietario_1
MIR_CODIGO_ARRENDADOR=codigo_arrendador_propietario_1

# URL del servicio MIR (común para todos)
MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion

# Configuración opcional
MIR_APLICACION=Delfin_Check_in
MIR_SIMULACION=false
MIR_DEBUG_SOAP=false
```

### 🔄 Configuración Dinámica por Propietario

Para un sistema verdaderamente multitenant, puedes implementar configuración dinámica:

```typescript
// Ejemplo de configuración dinámica por propietario
interface PropietarioMIRConfig {
  propietarioId: string;
  credenciales: {
    usuario: string;
    contraseña: string;
    codigoArrendador: string;
  };
  configuracion: {
    baseUrl: string;
    aplicacion: string;
    simulacion: boolean;
  };
}

// Base de datos de configuraciones por propietario
const configuracionesPropietarios: Record<string, PropietarioMIRConfig> = {
  'propietario_1': {
    propietarioId: 'propietario_1',
    credenciales: {
      usuario: 'PROPIETARIO1_CIF---WS',
      contraseña: 'contraseña_propietario_1',
      codigoArrendador: 'codigo_arrendador_1'
    },
    configuracion: {
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      aplicacion: 'Delfin_Check_in',
      simulacion: false
    }
  },
  'propietario_2': {
    propietarioId: 'propietario_2',
    credenciales: {
      usuario: 'PROPIETARIO2_CIF---WS',
      contraseña: 'contraseña_propietario_2',
      codigoArrendador: 'codigo_arrendador_2'
    },
    configuracion: {
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      aplicacion: 'Delfin_Check_in',
      simulacion: false
    }
  }
};
```

## 🎯 Implementación para Múltiples Propietarios

### 1. Configuración por Establecimiento

Cada establecimiento puede tener su propia configuración MIR:

```typescript
// En la base de datos de establecimientos
interface Establecimiento {
  id: string;
  nombre: string;
  codigoEstablecimiento: string;
  propietarioId: string;
  configuracionMIR: {
    usuario: string;
    contraseña: string;
    codigoArrendador: string;
    activo: boolean;
  };
}
```

### 2. Endpoints con Contexto de Propietario

Los endpoints pueden recibir el contexto del propietario:

```typescript
// Ejemplo de endpoint con contexto de propietario
export async function POST(req: NextRequest) {
  const { propietarioId, datosComunicacion } = await req.json();
  
  // Obtener configuración del propietario
  const config = await obtenerConfiguracionPropietario(propietarioId);
  
  // Crear cliente MIR con configuración específica
  const client = new MinisterioClientOfficial(config);
  
  // Procesar comunicación...
}
```

### 3. Panel de Administración por Propietario

Cada propietario puede acceder a su propio panel:

```
/admin/mir-comunicaciones?propietario=propietario_1
/admin/mir-comunicaciones?propietario=propietario_2
```

## 🔐 Seguridad y Aislamiento

### 1. Aislamiento de Datos

- Cada propietario solo puede ver sus propias comunicaciones
- Las credenciales están aisladas por propietario
- No hay acceso cruzado entre propietarios

### 2. Validación de Acceso

```typescript
// Middleware de validación de propietario
export async function validarAccesoPropietario(
  propietarioId: string, 
  usuarioId: string
): Promise<boolean> {
  // Verificar que el usuario pertenece al propietario
  const usuario = await obtenerUsuario(usuarioId);
  return usuario.propietarioId === propietarioId;
}
```

## 📋 Guía de Implementación para Nuevos Propietarios

### Paso 1: Registro en el MIR

1. **Registrarse en el MIR** como establecimiento de hospedaje
2. **Marcar la casilla** "Envío de comunicaciones por servicio web"
3. **Obtener credenciales**:
   - Usuario: CIF/NIF/NIE + '---WS'
   - Contraseña: Generada por el MIR
   - Código de arrendador: Asignado por el MIR

### Paso 2: Configuración en la Plataforma

1. **Acceder al panel de administración** de la plataforma
2. **Configurar credenciales MIR** en la sección correspondiente
3. **Verificar conexión** con el MIR usando el panel de pruebas
4. **Realizar envío de prueba** para confirmar funcionamiento

### Paso 3: Uso del Sistema

1. **Acceder al panel MIR** en `/admin/mir-comunicaciones`
2. **Consultar catálogos** para obtener códigos válidos
3. **Enviar comunicaciones** de forma automática o manual
4. **Monitorear estados** de las comunicaciones enviadas

## 🛠️ Herramientas de Gestión

### 1. Panel de Administración Global

Para administradores de la plataforma:

```
/admin/mir-propietarios
- Lista de todos los propietarios
- Estado de configuración MIR por propietario
- Estadísticas de envíos
- Gestión de credenciales
```

### 2. Panel de Propietario

Para cada propietario individual:

```
/admin/mir-comunicaciones
- Sus propias comunicaciones
- Envío de pruebas
- Consulta de catálogos
- Anulación de lotes
```

### 3. API de Gestión

```typescript
// Endpoints para gestión de propietarios
GET /api/admin/propietarios-mir
POST /api/admin/propietarios-mir
PUT /api/admin/propietarios-mir/:id
DELETE /api/admin/propietarios-mir/:id

// Endpoints para configuración MIR
GET /api/admin/mir-config/:propietarioId
POST /api/admin/mir-config/:propietarioId
PUT /api/admin/mir-config/:propietarioId
```

## 📊 Monitoreo y Estadísticas

### 1. Dashboard por Propietario

- Número de comunicaciones enviadas
- Tasa de éxito/error
- Última comunicación enviada
- Estado de configuración MIR

### 2. Dashboard Global

- Total de propietarios activos
- Estadísticas agregadas
- Alertas de configuración
- Monitoreo de salud del sistema

## 🔧 Mantenimiento y Soporte

### 1. Actualización de Credenciales

Cuando un propietario necesite actualizar sus credenciales MIR:

1. **Acceder al panel de configuración**
2. **Actualizar credenciales** en la sección MIR
3. **Verificar conexión** con las nuevas credenciales
4. **Realizar envío de prueba** para confirmar

### 2. Resolución de Problemas

Problemas comunes y soluciones:

- **Error de autenticación**: Verificar credenciales
- **Error de formato**: Consultar catálogos para códigos válidos
- **Error de conexión**: Verificar conectividad con MIR
- **Error de validación**: Revisar datos según esquemas XSD

### 3. Soporte Técnico

- **Documentación completa** en `IMPLEMENTACION_MIR_OFICIAL.md`
- **Panel de debug** con logs detallados
- **Modo simulación** para pruebas sin envío real
- **Herramientas de diagnóstico** integradas

## 🚀 Escalabilidad

### 1. Arquitectura Escalable

- **Configuración por base de datos** para múltiples propietarios
- **Cache de configuraciones** para mejor rendimiento
- **Rate limiting** por propietario
- **Monitoreo de recursos** por propietario

### 2. Integración con Sistemas Existentes

- **API REST** para integración con otros sistemas
- **Webhooks** para notificaciones de estado
- **Exportación de datos** en múltiples formatos
- **Sincronización** con sistemas de gestión

---

**Nota**: Este sistema está diseñado para ser completamente multitenant, permitiendo que múltiples propietarios utilicen la misma plataforma con total aislamiento de datos y configuraciones.
