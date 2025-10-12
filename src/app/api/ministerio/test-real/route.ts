import { NextRequest } from 'next/server';
import { MinisterioClient } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test endpoint de envío MIR REAL (entorno de pruebas)...');
    
    const body = await req.json();
    const { entorno = 'pruebas' } = body;
    
    // URLs oficiales del MIR
    const urls = {
      pruebas: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      produccion: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion'
    };
    
    const config = {
      baseUrl: urls[entorno as keyof typeof urls] || urls.pruebas,
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in',
      simulacion: false // Envío real al MIR
    };
    
    // Datos de prueba con tu código de establecimiento
    const testData = {
      codigoEstablecimiento: "0000256653",
      comunicaciones: [{
        contrato: {
          referencia: `TEST-REAL-${Date.now()}`,
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
    
    console.log('📋 Configuración:', {
      entorno,
      baseUrl: config.baseUrl,
      codigoArrendador: config.codigoArrendador,
      aplicacion: config.aplicacion
    });
    
    const client = new MinisterioClient(config);
    const result = await client.altaPV({ 
      xmlAlta: generateTestXML(testData) 
    });
    
    console.log('✅ Resultado del test REAL:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Test de envío MIR REAL completado (entorno: ${entorno})`,
      config: {
        entorno,
        baseUrl: config.baseUrl,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion,
        simulacion: false
      },
      resultado: result,
      testData: testData,
      urlsDisponibles: urls
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test MIR REAL:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test MIR REAL',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
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
        <direccion>
          <direccion>${data.comunicaciones[0].personas[0].direccion.direccion}</direccion>
          <codigoPostal>${data.comunicaciones[0].personas[0].direccion.codigoPostal}</codigoPostal>
          <pais>${data.comunicaciones[0].personas[0].direccion.pais}</pais>
          ${data.comunicaciones[0].personas[0].direccion.pais === 'ESP' ? `<codigoMunicipio>${data.comunicaciones[0].personas[0].direccion.codigoMunicipio}</codigoMunicipio>` : ''}
          ${data.comunicaciones[0].personas[0].direccion.pais !== 'ESP' && data.comunicaciones[0].personas[0].direccion.nombreMunicipio ? `<nombreMunicipio>${data.comunicaciones[0].personas[0].direccion.nombreMunicipio}</nombreMunicipio>` : ''}
        </direccion>
        <telefono>${data.comunicaciones[0].personas[0].telefono}</telefono>
        <correo>${data.comunicaciones[0].personas[0].correo}</correo>
      </persona>
    </comunicacion>
  </solicitud>
</peticion>`;
}

