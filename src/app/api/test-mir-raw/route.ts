import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Test MIR con petición mínima para diagnosticar...');
    
    const config = {
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in'
    };

    // Generar autenticación
    const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const authHeader = `Basic ${token}`;

    const resultados = [];

    // Test 1: Petición GET simple
    try {
      console.log('🧪 Test 1: GET simple');
      const res1 = await fetch(config.baseUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'User-Agent': 'Delfin_Check_in/1.0'
        },
        signal: AbortSignal.timeout(30000)
      });
      
      const text1 = await res1.text();
      resultados.push({
        test: 'GET simple',
        status: res1.status,
        statusText: res1.statusText,
        body: text1.substring(0, 500),
        success: res1.ok
      });
    } catch (error1) {
      resultados.push({
        test: 'GET simple',
        error: error1 instanceof Error ? error1.message : 'Error desconocido',
        success: false
      });
    }

    // Test 2: POST con XML mínimo
    try {
      console.log('🧪 Test 2: POST con XML mínimo');
      const xmlMinimo = `<?xml version="1.0" encoding="UTF-8"?>
<test>test</test>`;
      
      const res2 = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'text/xml; charset=utf-8',
          'User-Agent': 'Delfin_Check_in/1.0'
        },
        body: xmlMinimo,
        signal: AbortSignal.timeout(30000)
      });
      
      const text2 = await res2.text();
      resultados.push({
        test: 'POST XML mínimo',
        status: res2.status,
        statusText: res2.statusText,
        body: text2.substring(0, 500),
        success: res2.ok
      });
    } catch (error2) {
      resultados.push({
        test: 'POST XML mínimo',
        error: error2 instanceof Error ? error2.message : 'Error desconocido',
        success: false
      });
    }

    // Test 3: POST con SOAP envelope mínimo
    try {
      console.log('🧪 Test 3: POST con SOAP mínimo');
      const soapMinimo = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <test>test</test>
  </soapenv:Body>
</soapenv:Envelope>`;
      
      const res3 = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '""',
          'User-Agent': 'Delfin_Check_in/1.0'
        },
        body: soapMinimo,
        signal: AbortSignal.timeout(30000)
      });
      
      const text3 = await res3.text();
      resultados.push({
        test: 'POST SOAP mínimo',
        status: res3.status,
        statusText: res3.statusText,
        body: text3.substring(0, 500),
        success: res3.ok
      });
    } catch (error3) {
      resultados.push({
        test: 'POST SOAP mínimo',
        error: error3 instanceof Error ? error3.message : 'Error desconocido',
        success: false
      });
    }

    // Test 4: POST con estructura MIR básica
    try {
      console.log('🧪 Test 4: POST con estructura MIR básica');
      const mirBasico = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <peticion xmlns="http://www.mir.es/hospedajes-web/ws/v1">
      <cabecera>
        <codigoArrendador>${config.codigoArrendador}</codigoArrendador>
        <aplicacion>${config.aplicacion}</aplicacion>
        <tipoOperacion>A</tipoOperacion>
        <tipoComunicacion>PV</tipoComunicacion>
      </cabecera>
      <solicitud>test</solicitud>
    </peticion>
  </soapenv:Body>
</soapenv:Envelope>`;
      
      const res4 = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '""',
          'User-Agent': 'Delfin_Check_in/1.0'
        },
        body: mirBasico,
        signal: AbortSignal.timeout(30000)
      });
      
      const text4 = await res4.text();
      resultados.push({
        test: 'POST estructura MIR básica',
        status: res4.status,
        statusText: res4.statusText,
        body: text4.substring(0, 500),
        success: res4.ok
      });
    } catch (error4) {
      resultados.push({
        test: 'POST estructura MIR básica',
        error: error4 instanceof Error ? error4.message : 'Error desconocido',
        success: false
      });
    }

    // Test 5: Diferentes Content-Types
    try {
      console.log('🧪 Test 5: POST con Content-Type application/soap+xml');
      const soapMinimo = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <test>test</test>
  </soapenv:Body>
</soapenv:Envelope>`;
      
      const res5 = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': '""',
          'User-Agent': 'Delfin_Check_in/1.0'
        },
        body: soapMinimo,
        signal: AbortSignal.timeout(30000)
      });
      
      const text5 = await res5.text();
      resultados.push({
        test: 'POST application/soap+xml',
        status: res5.status,
        statusText: res5.statusText,
        body: text5.substring(0, 500),
        success: res5.ok
      });
    } catch (error5) {
      resultados.push({
        test: 'POST application/soap+xml',
        error: error5 instanceof Error ? error5.message : 'Error desconocido',
        success: false
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Test MIR con peticiones mínimas completado',
      configuracion: {
        url: config.baseUrl,
        username: config.username,
        codigoArrendador: config.codigoArrendador
      },
      resultados,
      analisis: {
        totalTests: resultados.length,
        exitosos: resultados.filter(r => r.success).length,
        fallidos: resultados.filter(r => !r.success).length,
        mejorResultado: resultados.find(r => r.success) || resultados[0]
      },
      recomendaciones: resultados.filter(r => r.success).length > 0 ? [
        '✅ Se encontró una petición que funciona',
        'Usar el formato y headers que funcionaron'
      ] : [
        '❌ Ninguna petición mínima funciona',
        'El problema puede ser más fundamental',
        'Verificar si el endpoint está realmente disponible'
      ]
    });

  } catch (error) {
    console.error('❌ Error en test MIR raw:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test MIR raw',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}




