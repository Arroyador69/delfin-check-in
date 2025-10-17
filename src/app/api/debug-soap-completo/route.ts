import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { MinisterioClientFixed, getMinisterioConfigFromEnv } from '@/lib/ministerio-client-fixed';
import { buildPvXml } from '@/lib/mir-xml-pv';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Debug SOAP completo...');
    
    const json = await req.json().catch(() => ({}));
    const { registroId } = json;
    
    if (!registroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de registro requerido'
      }, { status: 400 });
    }
    
    // Obtener el registro específico
    const result = await sql`
      SELECT 
        id,
        created_at,
        fecha_entrada,
        fecha_salida,
        data,
        reserva_ref
      FROM guest_registrations 
      WHERE id = ${registroId}
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Registro no encontrado'
      }, { status: 404 });
    }
    
    const row = result.rows[0];
    const data = row.data || {};
    
    // Extraer datos de la persona desde la estructura correcta
    const persona = data.comunicaciones?.[0]?.personas?.[0] || {};
    
    // Configuración MIR
    const config = {
      baseUrl: process.env.MIR_BASE_URL || '',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in',
      simulacion: false
    };
    
    // Preparar datos para el MIR con formato correcto para buildPvXml
    const datosMIR = {
      codigoEstablecimiento: config.codigoArrendador,
      contrato: {
        referencia: `DEBUG-${row.id}-${Date.now()}`,
        fechaContrato: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        fechaEntrada: (row.fecha_entrada ? new Date(row.fecha_entrada).toISOString() : new Date().toISOString()).replace('Z', ''), // YYYY-MM-DDTHH:mm:ss
        fechaSalida: (row.fecha_salida ? new Date(row.fecha_salida).toISOString() : new Date(Date.now() + 24*60*60*1000).toISOString()).replace('Z', ''), // YYYY-MM-DDTHH:mm:ss
        numPersonas: 1,
        tipoPago: "EFECT"
      },
      personas: [{
        nombre: (persona.nombre || "Viajero").trim().toUpperCase(),
        apellido1: (persona.apellido1 || "Apellido1").trim().toUpperCase(),
        apellido2: (persona.apellido2 || "Apellido2").trim().toUpperCase(), // Obligatorio para NIF
        tipoDocumento: (persona.tipoDocumento || "NIF") as 'NIF' | 'NIE' | 'PAS',
        numeroDocumento: (persona.numeroDocumento || "12345678Z").trim().toUpperCase(),
        fechaNacimiento: persona.fechaNacimiento || "1985-01-01", // YYYY-MM-DD
        direccion: {
          direccion: (persona.direccion?.direccion || "Calle Ejemplo 123").trim(),
          codigoPostal: (persona.direccion?.codigoPostal || "28001").trim(),
          pais: (persona.direccion?.pais || "ESP").trim().toUpperCase(), // ISO3
          codigoMunicipio: persona.direccion?.codigoMunicipio || "28079" // INE si país=ESP
        },
        correo: persona.correo || persona.contacto?.correo || "viajero@example.com", // Al menos uno: teléfono, teléfono2 o correo
        telefono: persona.telefono || persona.contacto?.telefono
      }]
    };
    
    // Generar XML interno
    const xmlContent = buildPvXml(datosMIR);
    
    // Usar el cliente MIR para generar el SOAP completo
    const mirConfig = getMinisterioConfigFromEnv();
    const client = new MinisterioClientFixed(mirConfig);
    
    // Simular el proceso de ZIP y Base64 (sin enviar)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('solicitud.xml', xmlContent);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const solicitudZipB64 = zipBuffer.toString('base64');
    
    // Generar SOAP envelope
    const soapStyle = mirConfig.soapStyle || 'mir';
    let soapXml: string;
    
    if (soapStyle === 'com') {
      // Usar buildSoapEnvelopeComunicacionAlt
      const ns = mirConfig.soapNamespace || 'http://www.soap.servicios.hospedajes.mir.es/comunicacion';
      const op = (mirConfig.soapOperation || 'comunicacion').replace(/[^A-Za-z0-9_]/g, '');
      const root = `${op}Request`;
      
      const cabecera = `
    <cabecera>
      <codigoArrendador>${config.codigoArrendador}</codigoArrendador>
      <aplicacion>${config.aplicacion}</aplicacion>
      <tipoOperacion>A</tipoOperacion>
      <tipoComunicacion>PV</tipoComunicacion>
    </cabecera>`;
      
      const solicitud = `
    <solicitud>${solicitudZipB64}</solicitud>`;
      
      const body = `<com:${root} xmlns:com="${ns}"><peticion>${cabecera}${solicitud}</peticion></com:${root}>`;
      
      soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
    } else {
      // Usar buildSoapEnvelopeComunicacionA
      const cabecera = `
    <cabecera>
      <codigoArrendador>${config.codigoArrendador}</codigoArrendador>
      <aplicacion>${config.aplicacion}</aplicacion>
      <tipoOperacion>A</tipoOperacion>
      <tipoComunicacion>PV</tipoComunicacion>
    </cabecera>`;
      
      const solicitud = `
    <solicitud>${solicitudZipB64}</solicitud>`;
      
      soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <peticion xmlns="http://www.mir.es/hospedajes-web/ws/v1">${cabecera}${solicitud}</peticion>
  </soapenv:Body>
</soapenv:Envelope>`;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug SOAP completo generado',
      configuracion: {
        soapStyle: soapStyle,
        soapAction: mirConfig.soapAction,
        soapNamespace: mirConfig.soapNamespace,
        soapOperation: mirConfig.soapOperation,
        baseUrl: config.baseUrl,
        codigoArrendador: config.codigoArrendador
      },
      xml_interno: {
        contenido: xmlContent,
        longitud: xmlContent.length,
        muestra: xmlContent.substring(0, 500) + '...'
      },
      zip_base64: {
        contenido: solicitudZipB64,
        longitud: solicitudZipB64.length,
        muestra: solicitudZipB64.substring(0, 120) + '...'
      },
      soap_envelope: {
        contenido: soapXml,
        longitud: soapXml.length,
        muestra: soapXml.substring(0, 800) + '...'
      },
      datos_usados: {
        nombre: persona.nombre,
        apellido1: persona.apellido1,
        pais: persona.direccion?.pais,
        tipoDocumento: persona.tipoDocumento
      }
    });
    
  } catch (error) {
    console.error('❌ Error en debug SOAP completo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en debug SOAP completo',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
