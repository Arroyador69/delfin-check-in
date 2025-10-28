import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Test de conectividad básica al MIR...');
    
    const url = 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion';
    
    // Test 1: Conectividad básica sin certificados
    try {
      console.log('🔍 Test 1: Conectividad básica...');
      const response1 = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        // @ts-ignore
        agent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });
      
      console.log('✅ Test 1 exitoso:', response1.status, response1.statusText);
    } catch (error1) {
      console.log('❌ Test 1 falló:', error1);
    }
    
    // Test 2: Con certificado del servidor
    try {
      console.log('🔍 Test 2: Con certificado del servidor...');
      const fs = require('fs');
      const path = require('path');
      const certPath = path.join(process.cwd(), 'mir-server-cert.pem');
      
      if (fs.existsSync(certPath)) {
        const cert = fs.readFileSync(certPath, 'utf8');
        
        const response2 = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
          // @ts-ignore
          agent: new (require('https').Agent)({
            ca: cert,
            rejectUnauthorized: true
          })
        });
        
        console.log('✅ Test 2 exitoso:', response2.status, response2.statusText);
      } else {
        console.log('❌ Test 2 falló: Certificado no encontrado');
      }
    } catch (error2) {
      console.log('❌ Test 2 falló:', error2);
    }
    
    // Test 3: Con SOAP básico
    try {
      console.log('🔍 Test 3: Con SOAP básico...');
      const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <test>Hello MIR</test>
  </soapenv:Body>
</soapenv:Envelope>`;
      
      const response3 = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'User-Agent': 'Delfin_Check_in/1.0'
        },
        body: soapXml,
        signal: AbortSignal.timeout(10000),
        // @ts-ignore
        agent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });
      
      const responseText = await response3.text();
      console.log('✅ Test 3 exitoso:', response3.status, response3.statusText);
      console.log('📄 Respuesta:', responseText.substring(0, 500));
      
    } catch (error3) {
      console.log('❌ Test 3 falló:', error3);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Tests de conectividad completados',
      timestamp: new Date().toISOString(),
      url: url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test de conectividad:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test de conectividad',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
