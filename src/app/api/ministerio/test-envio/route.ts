import { NextRequest } from 'next/server';
import { MinisterioClient, getMinisterioConfigFromEnv } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test endpoint de envío MIR...');
    
    // Datos de prueba con tu código de establecimiento
    const testData = {
      codigoEstablecimiento: "0000256653",
      comunicaciones: [{
        contrato: {
          referencia: "TEST-REF-001",
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
    
    console.log('📋 Datos de prueba:', JSON.stringify(testData, null, 2));
    
    // Configuración para test (usa variables de entorno)
    const config = {
      baseUrl: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in',
      simulacion: true // Forzar modo simulación
    };
    
    const client = new MinisterioClient(config);
    const result = await client.altaPV({ 
      xmlAlta: generateTestXML(testData) 
    });
    
    console.log('✅ Resultado del test:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test de envío MIR completado',
      config: {
        simulacion: config.simulacion,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion
      },
      resultado: result,
      testData: testData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test MIR:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
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
          ${data.comunicaciones[0].personas[0].direccion.pais === 'ESP' ? `<codigoMunicipio>${data.comunicaciones[0].personas[0].direccion.codigoMunicipio}</codigoMunicipio>` : ''}
          ${data.comunicaciones[0].personas[0].direccion.pais !== 'ESP' && data.comunicaciones[0].personas[0].direccion.nombreMunicipio ? `<nombreMunicipio>${data.comunicaciones[0].personas[0].direccion.nombreMunicipio}</nombreMunicipio>` : ''}
          <codigoPostal>${data.comunicaciones[0].personas[0].direccion.codigoPostal}</codigoPostal>
          <pais>${data.comunicaciones[0].personas[0].direccion.pais}</pais>
        </direccion>
        <telefono>${data.comunicaciones[0].personas[0].telefono}</telefono>
        <correo>${data.comunicaciones[0].personas[0].correo}</correo>
      </persona>
    </comunicacion>
  </solicitud>
</peticion>`;
}

