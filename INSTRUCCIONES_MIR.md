# 🏛️ Instrucciones para Configurar el Envío al MIR

## ✅ Estado Actual

- ✅ Formulario para extranjeros funciona correctamente
- ✅ Cliente MIR compatible con Vercel Edge Runtime
- ✅ SSL bypass configurado (NODE_TLS_REJECT_UNAUTHORIZED)
- ✅ Autenticación Basic HTTP implementada
- ✅ XML Schema validado según especificación MIR
- ⚠️ Error 502 en pruebas con servidor pre-producción

## 🔧 Configuración de Variables de Entorno en Vercel

Las siguientes variables deben estar configuradas en Vercel:

```
MIR_BASE_URL=https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion
MIR_HTTP_USER=27380387Z
MIR_HTTP_PASS=[tu_contraseña]
MIR_CODIGO_ARRENDADOR=0000146962
MIR_APLICACION=Delfin_Check_in
MIR_SIMULACION=false
```

## 📋 Requisitos del XML según Documentación MIR

### Campos Obligatorios

#### Cabecera SOAP
- `codigoArrendador`: Código asignado al registrarse
- `aplicacion`: Nombre de la aplicación (máx 50 caracteres)
- `tipoOperacion`: "A" para alta
- `tipoComunicacion`: "PV" para partes de viajeros

#### Solicitud (XML Interno)
El XML debe estar:
1. Codificado en UTF-8
2. Comprimido con ZIP
3. Codificado en Base64

#### Estructura del XML Interno
```xml
<peticion>
  <solicitud>
    <codigoEstablecimiento>0000256653</codigoEstablecimiento>
    <comunicacion>
      <contrato>
        <referencia>...</referencia>
        <fechaContrato>AAAA-MM-DD</fechaContrato>
        <fechaEntrada>AAAA-MM-DDThh:mm:ss</fechaEntrada>
        <fechaSalida>AAAA-MM-DDThh:mm:ss</fechaSalida>
        <numPersonas>1</numPersonas>
        <numHabitaciones>1</numHabitaciones>
        <internet>true|false</internet>
        <pago>
          <tipoPago>EFECT|TARJT|...</tipoPago>
          <fechaPago>AAAA-MM-DD</fechaPago>
        </pago>
      </contrato>
      <persona>
        <rol>VI</rol>
        <nombre>...</nombre>
        <apellido1>...</apellido1>
        <apellido2>...</apellido2> <!-- Obligatorio para NIF -->
        <tipoDocumento>NIF|NIE|PAS</tipoDocumento>
        <numeroDocumento>...</numeroDocumento>
        <soporteDocumento>C</soporteDocumento> <!-- Obligatorio para NIF/NIE -->
        <fechaNacimiento>AAAA-MM-DD</fechaNacimiento>
        <nacionalidad>ESP</nacionalidad>
        <sexo>H|M|O</sexo>
        <telefono>...</telefono> <!-- Al menos uno: telefono, telefono2 o correo -->
        <correo>...</correo>
        <direccion>
          <direccion>...</direccion>
          <codigoPostal>...</codigoPostal>
          <pais>ESP</pais>
          <codigoMunicipio>28079</codigoMunicipio>
        </direccion>
      </persona>
    </comunicacion>
  </solicitud>
</peticion>
```

## 🔍 Diagnóstico del Error 502

El error 502 "Proxy Error - Error reading from remote server" puede deberse a:

1. **Certificado SSL**: El MIR requiere un certificado específico importado
2. **Timeout del servidor**: El servidor de pre-producción puede tener problemas
3. **Formato de request**: Aunque el XML parece correcto, puede haber algún detalle
4. **IP Whitelisting**: Vercel puede necesitar estar en una lista blanca

## 🚀 Próximos Pasos

### Opción 1: Contactar con Soporte del MIR
- Verificar si Vercel necesita estar en lista blanca
- Solicitar certificado SSL específico si es necesario
- Confirmar que el endpoint de pre-producción está funcional

### Opción 2: Modo Simulación para Desarrollo
Mientras tanto, puedes usar el modo simulación:
```
MIR_SIMULACION=true
```
Esto permite probar todo el flujo sin enviar al MIR real.

### Opción 3: Consulta de Lotes
Una vez que tengas comunicaciones enviadas exitosamente, usa el endpoint:
```
POST /api/ministerio/consulta-lotes
{
  "lotes": ["LOTE-123", "LOTE-456"]
}
```

## 📞 Contacto Soporte MIR

- **Sede Electrónica**: https://sede.mir.es
- **Documentación**: Servicio de Comunicación de Hospedajes
- **Registro de Entidad**: Necesario para obtener credenciales

## 🔐 Seguridad

⚠️ **IMPORTANTE**: 
- Las credenciales están en variables de entorno de Vercel
- El bypass SSL (NODE_TLS_REJECT_UNAUTHORIZED=0) solo se activa temporalmente durante la petición
- La autenticación Basic HTTP se envía en la cabecera Authorization

## ✅ Checklist de Verificación

- [x] Variables de entorno configuradas
- [x] Cliente MIR compatible con Vercel
- [x] SSL bypass implementado
- [x] XML Schema validado
- [x] Compresión ZIP + Base64
- [x] Autenticación Basic HTTP
- [x] Formato de fechas correcto
- [x] Campos obligatorios incluidos
- [ ] Certificado SSL importado (si es necesario)
- [ ] IP whitelisting (si es necesario)
- [ ] Test exitoso con servidor MIR

