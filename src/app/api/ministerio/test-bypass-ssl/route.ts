import { NextRequest } from 'next/server';
import { MinisterioClient } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test MIR con bypass SSL temporal...');
    
    // Configuración con bypass SSL (solo para diagnóstico)
    const config = {
      baseUrl: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: '27380387Z',
      password: 'Marazulado_',
      codigoArrendador: '0000146962',
      aplicacion: 'Delfin_Check_in',
      simulacion: false // Envío real al MIR
    };
    
    // Datos de prueba
    const testData = {
      codigoEstablecimiento: "0000256653",
      comunicaciones: [{
        contrato: {
          referencia: `TEST-BYPASS-${Date.now()}`,
          fechaContrato: "2025-01-15",
          fechaEntrada: "2025-01-15T14:00:00",
          fechaSalida: "2025-01-17T11:00:00",
          numPersonas: 1,
          numHabitaciones: 1,
          internet: false,
          pago: {
            tipoPago: "EFECT",
            fechaPago: "2025-01-15"
          }
        },
        personas: [{
          rol: "VI",
          nombre: "Juan",
          apellido1: "García",
          apellido2: "López",
          tipoDocumento: "NIF",
          numeroDocumento: "12345678Z",
          fechaNacimiento: "1985-03-15",
          nacionalidad: "ESP",
          sexo: "M",
          telefono: "600123456",
          correo: "juan.garcia@example.com",
          direccion: {
            direccion: "Calle Mayor 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079"
          }
        }]
      }]
    };
    
    // Crear cliente con bypass SSL
    const client = new MinisterioClient(config);
    
    // Generar XML
    const xmlAlta = generateTestXML(testData);
    
    // Enviar con bypass SSL
    const result = await sendWithBypassSSL(config, xmlAlta);
    
    console.log('✅ Resultado del test con bypass SSL:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test MIR con bypass SSL completado',
      config: {
        entorno: 'pruebas',
        baseUrl: config.baseUrl,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion,
        bypassSSL: true
      },
      resultado: result,
      testData: testData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test MIR con bypass SSL:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test MIR con bypass SSL',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function sendWithBypassSSL(config: any, xmlAlta: string): Promise<any> {
  const JSZip = require('jszip');
  
  // Comprimir XML
  const zip = new JSZip();
  zip.file('solicitud.xml', xmlAlta, { createFolders: false });
  const zipped = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const solicitudZipB64 = Buffer.from(zipped).toString('base64');
  
  // Construir SOAP
  const soapXml = buildSoapEnvelopeComunicacionA(config, solicitudZipB64);
  
  // Enviar con bypass SSL
  const res = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': buildBasicAuthHeader(config.username, config.password),
      'Content-Type': 'text/xml; charset=utf-8',
      'User-Agent': 'Delfin_Check_in/1.0'
    },
    body: soapXml,
    signal: AbortSignal.timeout(30000),
    // @ts-ignore - Bypass SSL para diagnóstico
    agent: new (require('https').Agent)({
      rejectUnauthorized: false // Bypass SSL temporal
    })
  });
  
  const text = await res.text();
  return {
    status: res.status,
    statusText: res.statusText,
    response: text,
    headers: Object.fromEntries(res.headers.entries())
  };
}

function buildBasicAuthHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${token}`;
}

function buildSoapEnvelopeComunicacionA(cfg: any, solicitudZipB64: string): string {
  const cabecera = `
    <cabecera>
      <codigoArrendador>${escapeXml(cfg.codigoArrendador)}</codigoArrendador>
      <aplicacion>${escapeXml(cfg.aplicacion).slice(0, 50)}</aplicacion>
      <tipoOperacion>A</tipoOperacion>
      <tipoComunicacion>PV</tipoComunicacion>
    </cabecera>`;
  const solicitud = `
    <solicitud>${solicitudZipB64}</solicitud>`;
  return wrapSoapEnvelope(`<peticion>${cabecera}${solicitud}</peticion>`);
}

function wrapSoapEnvelope(innerXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${innerXml}
  </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateTestXML(data: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <solicitud>
    <codigoEstablecimiento>${data.codigoEstablecimiento}</codigoEstablecimiento>
    <comunicacion>
      <contrato>
        <referencia>${data.comunicaciones[0].contrato.referencia}</referencia>
        <fechaContrato>${data.comunicaciones[0].contrato.fechaContrato}</fechaContrato>
        <fechaEntrada>${data.comunicaciones[0].contrato.fechaEntrada}</fechaEntrada>
        <fechaSalida>${data.comunicaciones[0].contrato.fechaSalida}</fechaSalida>
        <numPersonas>${data.comunicaciones[0].contrato.numPersonas}</numPersonas>
        <numHabitaciones>${data.comunicaciones[0].contrato.numHabitaciones}</numHabitaciones>
        <internet>${data.comunicaciones[0].contrato.internet}</internet>
        <pago>
          <tipoPago>${data.comunicaciones[0].contrato.pago.tipoPago}</tipoPago>
          <fechaPago>${data.comunicaciones[0].contrato.pago.fechaPago}</fechaPago>
        </pago>
      </contrato>
      <persona>
        <rol>${data.comunicaciones[0].personas[0].rol}</rol>
        <nombre>${data.comunicaciones[0].personas[0].nombre}</nombre>
        <apellido1>${data.comunicaciones[0].personas[0].apellido1}</apellido1>
        <apellido2>${data.comunicaciones[0].personas[0].apellido2}</apellido2>
        <tipoDocumento>${data.comunicaciones[0].personas[0].tipoDocumento}</tipoDocumento>
        <numeroDocumento>${data.comunicaciones[0].personas[0].numeroDocumento}</numeroDocumento>
        <fechaNacimiento>${data.comunicaciones[0].personas[0].fechaNacimiento}</fechaNacimiento>
        <nacionalidad>${data.comunicaciones[0].personas[0].nacionalidad}</nacionalidad>
        <sexo>${data.comunicaciones[0].personas[0].sexo}</sexo>
        <telefono>${data.comunicaciones[0].personas[0].telefono}</telefono>
        <correo>${data.comunicaciones[0].personas[0].correo}</correo>
        <direccion>
          <direccion>${data.comunicaciones[0].personas[0].direccion.direccion}</direccion>
          <codigoPostal>${data.comunicaciones[0].personas[0].direccion.codigoPostal}</codigoPostal>
          <pais>${data.comunicaciones[0].personas[0].direccion.pais}</pais>
          <codigoMunicipio>${data.comunicaciones[0].personas[0].direccion.codigoMunicipio}</codigoMunicipio>
        </direccion>
      </persona>
    </comunicacion>
  </solicitud>
</peticion>`;
}
