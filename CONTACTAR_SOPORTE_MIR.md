# 📞 Guía para Contactar al Soporte del MIR

## 🎯 Objetivo
Resolver el Error 502 (Bad Gateway) al intentar comunicar con el servidor de pre-producción del MIR.

## 📋 Información Técnica a Proporcionar

### 1. Datos de Identificación
```
Entidad: HABITACIONES EN CASA VACACIONAL FUENGIROLA
Código Establecimiento: 0000256653
Código Arrendador: 0000146962
Usuario: 27380387Z
Referencia: DOLORES MARIA ARROYO ZAMBRANO (0000146967)
```

### 2. Descripción del Problema
```
Al intentar realizar un envío de Parte de Viajeros (PV) mediante la operación 
'comunicacion' al endpoint de pre-producción:

https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion

Recibimos un Error 502 (Bad Gateway / Proxy Error) con el mensaje:
"The proxy server received an invalid response from an upstream server.
The proxy server could not handle the request. 
Reason: Error reading from remote server"
```

### 3. Verificaciones Realizadas

✅ **Autenticación**
- Autenticación Basic HTTP implementada correctamente
- Cabecera Authorization con credenciales en Base64
- Usuario y contraseña configurados según registro

✅ **Formato SOAP**
- Estructura de cabecera validada:
  - codigoArrendador: 0000146962
  - aplicacion: Delfin_Check_in
  - tipoOperacion: A (alta)
  - tipoComunicacion: PV (partes de viajeros)

✅ **Formato XML Interno**
- XML codificado en UTF-8
- Comprimido con algoritmo ZIP
- Codificado en Base64
- Todos los campos obligatorios incluidos:
  - codigoEstablecimiento
  - fechaEntrada/fechaSalida (formato AAAA-MM-DDThh:mm:ss)
  - Bloque pago completo
  - Datos de personas con rol VI
  - soporteDocumento (obligatorio para NIF/NIE)
  - Al menos un campo de contacto (telefono/correo)

✅ **Seguridad SSL/TLS**
- Bypass de verificación de certificados implementado
- Timeout configurado a 30 segundos
- Headers HTTP correctos (Content-Type: text/xml; charset=utf-8)

### 4. Entorno Técnico

```
Plataforma: Vercel Edge Runtime (Serverless)
Región: AWS (dinámica según Vercel)
Protocolo: HTTPS con TLS 1.2+
Cliente HTTP: Node.js fetch API
Librería de compresión: JSZip
```

### 5. Preguntas Específicas para el Soporte

1. **IP Whitelisting**
   - ¿El servidor de pre-producción requiere whitelist de IPs?
   - ¿Cuáles son las IPs o rangos autorizados?
   - ¿Es posible autorizar todo el rango de IPs de Vercel/AWS?

2. **Certificados SSL**
   - ¿Se requiere un certificado cliente (Client Certificate) específico?
   - ¿Dónde se obtiene este certificado?
   - ¿Cómo se debe configurar en un entorno serverless?

3. **Estado del Servicio**
   - ¿El endpoint de pre-producción está operativo actualmente?
   - ¿Hay algún mantenimiento programado?
   - ¿Existe un endpoint alternativo para pruebas?

4. **Logs del Servidor**
   - ¿Pueden verificar los logs del servidor para el usuario 27380387Z?
   - ¿Qué muestra el log del gateway/proxy?
   - ¿La solicitud está llegando al servidor o se rechaza en el firewall?

## 📧 Canales de Contacto

### Sede Electrónica del MIR
- **URL**: https://sede.mir.es
- **Sección**: Comunicación de Hospedajes
- **Opción**: Soporte Técnico

### Documentación Oficial
- Manual de Usuario del Servicio de Comunicación
- Especificación Técnica del Web Service
- Catálogo de Códigos de Error

### Teléfono de Soporte
- Consultar en la Sede Electrónica el número de soporte técnico

## 📎 Adjuntar a la Consulta

### Ejemplo de Petición SOAP (sin datos sensibles)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <peticion>
      <cabecera>
        <codigoArrendador>0000146962</codigoArrendador>
        <aplicacion>Delfin_Check_in</aplicacion>
        <tipoOperacion>A</tipoOperacion>
        <tipoComunicacion>PV</tipoComunicacion>
      </cabecera>
      <solicitud>[XML_COMPRIMIDO_BASE64]</solicitud>
    </peticion>
  </soapenv:Body>
</soapenv:Envelope>
```

### Logs de Error
```
Status HTTP: 502
Content-Type: text/html
Body: 
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>502 Proxy Error</title>
</head><body>
<h1>Proxy Error</h1>
<p>The proxy server received an invalid response from an upstream server.<br />
The proxy server could not handle the request
<p>Reason: <strong>Error reading from remote server</strong></p></p>
</body></html>
```

## ⏱️ Urgencia

**Prioridad**: Alta

Tenemos registros de huéspedes pendientes de comunicar al Ministerio del Interior.
Necesitamos resolver este problema para cumplir con la normativa de comunicación de partes de viajeros.

## 📝 Notas Adicionales

- Estamos dispuestos a realizar pruebas adicionales según sus indicaciones
- Podemos proporcionar logs más detallados si es necesario
- Tenemos capacidad de implementar certificados o configuraciones específicas
- El sistema funciona correctamente en modo simulación (todos los componentes validados)

---

**Fecha de la consulta**: [FECHA]
**Responsable técnico**: Alberto García Arroyo
**Email de contacto**: contacto@delfincheckin.com
**Sistema**: Delfín Check-in (Gestión de Hospedajes)

