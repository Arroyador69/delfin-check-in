import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test MIR en entorno de PRUEBAS...');
    
    const config = {
      baseUrl: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in'
    };

    // Generar autenticación
    const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const authHeader = `Basic ${token}`;

    console.log('📋 Configuración PRUEBAS:', {
      url: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      authHeader: authHeader
    });

    // XML simple pero válido para el MIR
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<solicitud>
  <codigoEstablecimiento>${config.codigoArrendador}</codigoEstablecimiento>
  <comunicacion>
    <contrato>
      <referencia>PRUEBAS-TEST-${Date.now()}</referencia>
      <fechaContrato>2025-01-16</fechaContrato>
      <fechaEntrada>2025-01-16T14:00:00</fechaEntrada>
      <fechaSalida>2025-01-18T11:00:00</fechaSalida>
      <numPersonas>1</numPersonas>
      <numHabitaciones>1</numHabitaciones>
      <internet>false</internet>
      <pago>
        <tipoPago>EFECT</tipoPago>
        <fechaPago>2025-01-16</fechaPago>
      </pago>
    </contrato>
    <persona>
      <rol>VI</rol>
      <nombre>Test</nombre>
      <apellido1>Pruebas</apellido1>
      <apellido2>MIR</apellido2>
      <tipoDocumento>NIF</tipoDocumento>
      <numeroDocumento>12345678Z</numeroDocumento>
      <soporteDocumento>C</soporteDocumento>
      <fechaNacimiento>1985-01-01</fechaNacimiento>
      <nacionalidad>ESP</nacionalidad>
      <sexo>M</sexo>
      <telefono>600000000</telefono>
      <correo>test@pruebas.com</correo>
      <direccion>
        <direccion>Calle Pruebas 123</direccion>
        <codigoPostal>28001</codigoPostal>
        <pais>ESP</pais>
        <codigoMunicipio>28079</codigoMunicipio>
      </direccion>
    </persona>
  </comunicacion>
</solicitud>`;

    // Comprimir en ZIP y codificar en Base64
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addFile('solicitud.xml', Buffer.from(xmlContent, 'utf8'));
    const zipBuffer = zip.toBuffer();
    const solicitudZipB64 = zipBuffer.toString('base64');

    // Generar SOAP envelope
    const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <peticion xmlns="http://www.mir.es/hospedajes-web/ws/v1">
      <cabecera>
        <codigoArrendador>${config.codigoArrendador}</codigoArrendador>
        <aplicacion>${config.aplicacion}</aplicacion>
        <tipoOperacion>A</tipoOperacion>
        <tipoComunicacion>PV</tipoComunicacion>
      </cabecera>
      <solicitud>${solicitudZipB64}</solicitud>
    </peticion>
  </soapenv:Body>
</soapenv:Envelope>`;

    console.log('📤 Enviando al MIR PRUEBAS...');

    // Configuración para pruebas
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'Delfin_Check_in/1.0',
        'Accept': 'text/xml, application/xml, */*'
      },
      body: soapXml,
      signal: AbortSignal.timeout(60000)
    };

    // Deshabilitar verificación SSL
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    let res: Response;
    try {
      res = await fetch(config.baseUrl, fetchOptions);
    } finally {
      if (originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }
    }

    const text = await res.text();
    
    console.log('📊 Respuesta del MIR PRUEBAS:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      bodyLength: text.length
    });

    return NextResponse.json({
      success: true,
      message: 'Test MIR en entorno de PRUEBAS completado',
      configuracion: {
        url: config.baseUrl,
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion,
        entorno: 'PRUEBAS'
      },
      resultado: {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        body: text.substring(0, 1000),
        bodyLength: text.length
      },
      interpretacion: {
        conectividad: res.status ? '✅ Conectividad OK' : '❌ Sin conectividad',
        autenticacion: res.status === 401 ? '❌ Error de autenticación' : '✅ Autenticación OK',
        endpoint: res.status === 404 ? '❌ Endpoint no encontrado' : '✅ Endpoint OK',
        servidor: res.headers.get('server') ? '✅ Servidor MIR responde' : '❌ Servidor no responde',
        recomendacion: res.status === 404 ? 
          'El endpoint de pruebas también devuelve 404. Problema con la estructura de URLs del MIR.' :
          res.ok ? 
          '🎉 ¡Funcionando en pruebas!' :
          'Revisar configuración según el status code'
      }
    });

  } catch (error) {
    console.error('❌ Error en test MIR pruebas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test MIR pruebas',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
