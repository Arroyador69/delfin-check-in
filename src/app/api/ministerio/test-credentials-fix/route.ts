import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Test de corrección de credenciales MIR...');
    
    const config = {
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in'
    };

    console.log('📋 Configuración actual:', {
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      baseUrl: config.baseUrl,
      passwordLength: config.password.length
    });

    // Diferentes métodos de codificación Base64 para probar
    const authTests = [
      {
        name: 'Método 1: Codificación estándar (usuario:contraseña)',
        method: () => {
          const credentials = `${config.username}:${config.password}`;
          return Buffer.from(credentials, 'utf8').toString('base64');
        }
      },
      {
        name: 'Método 2: Codificación con btoa (navegador)',
        method: () => {
          const credentials = `${config.username}:${config.password}`;
          return Buffer.from(credentials).toString('base64');
        }
      },
      {
        name: 'Método 3: Codificación con encoding específico',
        method: () => {
          const credentials = `${config.username}:${config.password}`;
          return Buffer.from(credentials, 'ascii').toString('base64');
        }
      },
      {
        name: 'Método 4: Codificación con trim de espacios',
        method: () => {
          const credentials = `${config.username.trim()}:${config.password.trim()}`;
          return Buffer.from(credentials, 'utf8').toString('base64');
        }
      },
      {
        name: 'Método 5: Codificación con escape de caracteres especiales',
        method: () => {
          const username = config.username.replace(/[^\x20-\x7E]/g, '');
          const password = config.password.replace(/[^\x20-\x7E]/g, '');
          const credentials = `${username}:${password}`;
          return Buffer.from(credentials, 'utf8').toString('base64');
        }
      }
    ];

    const resultados = [];

    for (const authTest of authTests) {
      try {
        console.log(`🧪 Probando: ${authTest.name}`);
        
        const token = authTest.method();
        const authHeader = `Basic ${token}`;
        
        console.log(`📝 Token generado: ${token.substring(0, 20)}...`);
        console.log(`🔑 Header completo: ${authHeader.substring(0, 30)}...`);

        // XML mínimo para probar autenticación
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<solicitud>
  <codigoEstablecimiento>0000256653</codigoEstablecimiento>
  <codigoArrendador>${config.codigoArrendador}</codigoArrendador>
  <aplicacion>${config.aplicacion}</aplicacion>
  <tipoOperacion>A</tipoOperacion>
  <tipoComunicacion>PV</tipoComunicacion>
  <datosViajero>
    <nombre>TEST</nombre>
    <apellidos>CREDENTIALS</apellidos>
    <fechaNacimiento>1990-01-01</fechaNacimiento>
    <nacionalidad>ES</nacionalidad>
    <tipoDocumento>NIF</tipoDocumento>
    <numeroDocumento>12345678Z</numeroDocumento>
    <fechaEntrada>${new Date().toISOString().split('T')[0]}</fechaEntrada>
    <fechaSalida>${new Date().toISOString().split('T')[0]}</fechaSalida>
  </datosViajero>
</solicitud>`;

        // Comprimir en ZIP y codificar en Base64
        const JSZip = require('jszip');
        const zip = new JSZip();
        zip.file('solicitud.xml', xmlContent, { createFolders: false });
        const zipped = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const solicitudZipB64 = Buffer.from(zipped).toString('base64');

        // SOAP envelope
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

        // Configuración de fetch con timeout
        const fetchOptions: RequestInit = {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'text/xml; charset=utf-8',
            'User-Agent': 'Delfin_Check_in/1.0',
            'Accept': 'text/xml, application/xml, */*',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: soapXml,
          signal: AbortSignal.timeout(30000)
        };

        console.log('📡 Enviando petición...');
        const response = await fetch(config.baseUrl, fetchOptions);
        
        const responseText = await response.text();
        
        console.log(`📊 Respuesta: ${response.status} ${response.statusText}`);
        console.log(`📋 Body (primeros 500 chars): ${responseText.substring(0, 500)}`);

        resultados.push({
          metodo: authTest.name,
          token: token,
          authHeader: authHeader,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          responseBody: responseText.substring(0, 1000),
          headers: Object.fromEntries(response.headers.entries())
        });

        // Si encontramos una respuesta exitosa, la marcamos
        if (response.ok) {
          console.log(`✅ ¡ÉXITO! Método que funciona: ${authTest.name}`);
          break;
        }

      } catch (error) {
        console.error(`❌ Error en ${authTest.name}:`, error);
        resultados.push({
          metodo: authTest.name,
          error: error instanceof Error ? error.message : 'Error desconocido',
          success: false
        });
      }
    }

    // Analizar resultados
    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    console.log(`📊 Resumen: ${exitosos.length} exitosos, ${fallidos.length} fallidos`);

    return NextResponse.json({
      success: exitosos.length > 0,
      configuracion: {
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        baseUrl: config.baseUrl
      },
      resultados,
      resumen: {
        total: resultados.length,
        exitosos: exitosos.length,
        fallidos: fallidos.length,
        metodoRecomendado: exitosos.length > 0 ? exitosos[0].metodo : null
      },
      recomendacion: exitosos.length > 0 
        ? `✅ Usar el método: ${exitosos[0].metodo}`
        : '❌ Ningún método de codificación funcionó. Verificar credenciales.'
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
