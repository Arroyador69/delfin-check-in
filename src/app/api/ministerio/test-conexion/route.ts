import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientVercel } from '@/lib/ministerio-client-vercel';

/**
 * Test de conexión al MIR
 * Verifica que las credenciales estén configuradas correctamente
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateTestXML(data: any): string {
  const comunicacion = data.comunicaciones[0];
  const persona = comunicacion.personas[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">
  <solicitud>
    <codigoEstablecimiento>${escapeXml(data.codigoEstablecimiento)}</codigoEstablecimiento>
    <comunicacion>
      <contrato>
        <referencia>${escapeXml(comunicacion.contrato.referencia)}</referencia>
        <fechaContrato>${comunicacion.contrato.fechaContrato}</fechaContrato>
        <fechaEntrada>${comunicacion.contrato.fechaEntrada}</fechaEntrada>
        <fechaSalida>${comunicacion.contrato.fechaSalida}</fechaSalida>
        <numPersonas>${comunicacion.contrato.numPersonas}</numPersonas>
        <numHabitaciones>${comunicacion.contrato.numHabitaciones}</numHabitaciones>
        <internet>${comunicacion.contrato.internet}</internet>
        <pago>
          <tipoPago>${escapeXml(comunicacion.contrato.pago.tipoPago)}</tipoPago>
          <fechaPago>${comunicacion.contrato.pago.fechaPago}</fechaPago>
        </pago>
      </contrato>
      <persona>
        <rol>${escapeXml(persona.rol)}</rol>
        <nombre>${escapeXml(persona.nombre)}</nombre>
        <apellido1>${escapeXml(persona.apellido1)}</apellido1>
        <apellido2>${escapeXml(persona.apellido2)}</apellido2>
        <tipoDocumento>${escapeXml(persona.tipoDocumento)}</tipoDocumento>
        <numeroDocumento>${escapeXml(persona.numeroDocumento)}</numeroDocumento>
        ${persona.soporteDocumento ? `<soporteDocumento>${escapeXml(persona.soporteDocumento)}</soporteDocumento>` : ''}
        <fechaNacimiento>${persona.fechaNacimiento}</fechaNacimiento>
        <nacionalidad>${escapeXml(persona.nacionalidad)}</nacionalidad>
        <sexo>${escapeXml(persona.sexo)}</sexo>
        <direccion>
          <direccion>${escapeXml(persona.direccion.direccion)}</direccion>
          <codigoPostal>${escapeXml(persona.direccion.codigoPostal)}</codigoPostal>
          <pais>${escapeXml(persona.direccion.pais)}</pais>
          <codigoMunicipio>${escapeXml(persona.direccion.codigoMunicipio)}</codigoMunicipio>
        </direccion>
        ${persona.telefono ? `<telefono>${escapeXml(persona.telefono)}</telefono>` : ''}
        ${persona.correo ? `<correo>${escapeXml(persona.correo)}</correo>` : ''}
      </persona>
    </comunicacion>
  </solicitud>
</alt:peticion>`;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Probando conexión con el MIR...');
    
    // Verificar que las variables de entorno estén configuradas
    const requiredEnvVars = {
      MIR_BASE_URL: process.env.MIR_BASE_URL,
      MIR_HTTP_USER: process.env.MIR_HTTP_USER,
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS,
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR,
      MIR_APLICACION: process.env.MIR_APLICACION
    };

    console.log('📋 Variables de entorno:');
    Object.entries(requiredEnvVars).forEach(([key, value]) => {
      if (key.includes('PASS')) {
        console.log(`  ${key}: ${value ? '***' : '❌ NO CONFIGURADA'}`);
      } else {
        console.log(`  ${key}: ${value || '❌ NO CONFIGURADA'}`);
      }
    });

    // Verificar que todas las variables estén configuradas
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno faltantes',
        missingVars,
        message: `Faltan las siguientes variables: ${missingVars.join(', ')}`
      }, { status: 400 });
    }

    // Configuración del MIR
    const config = {
      baseUrl: process.env.MIR_BASE_URL!,
      username: process.env.MIR_HTTP_USER!,
      password: process.env.MIR_HTTP_PASS!,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR!,
      aplicacion: process.env.MIR_APLICACION!,
      simulacion: false
    };

    console.log('🔧 Configuración MIR:', {
      baseUrl: config.baseUrl,
      username: config.username,
      password: '***',
      codigoArrendador: config.codigoArrendador,
      aplicacion: config.aplicacion,
      simulacion: config.simulacion
    });

    // Crear cliente MIR (versión Vercel)
    const client = new MinisterioClientVercel(config);
    
    // Intentar un envío de prueba simple
    const referencia = `TEST-CON-${Date.now()}`;
        const datosPrueba = {
          codigoEstablecimiento: "0000256653",
          comunicaciones: [{
            contrato: {
              referencia: referencia,
              fechaContrato: new Date().toISOString().split('T')[0], // Solo fecha: AAAA-MM-DD
              fechaEntrada: new Date().toISOString(), // Fecha+hora: AAAA-MM-DDThh:mm:ss
              fechaSalida: new Date(Date.now() + 24*60*60*1000).toISOString(), // Fecha+hora: AAAA-MM-DDThh:mm:ss
              numPersonas: 1,
              numHabitaciones: 1,
              internet: false,
              pago: {
                tipoPago: "EFECT",
                fechaPago: new Date().toISOString().split('T')[0] // Solo fecha: AAAA-MM-DD
              }
            },
            personas: [{
              rol: "VI",
              nombre: "TEST",
              apellido1: "CONEXION",
              apellido2: "MIR",
              tipoDocumento: "NIF",
              numeroDocumento: "12345678Z",
              soporteDocumento: "C", // C = Certificado, obligatorio para NIF/NIE
              fechaNacimiento: "1985-01-01", // Solo fecha: AAAA-MM-DD
          nacionalidad: "ESP",
          sexo: "H", // H = Hombre, M = Mujer, O = Otro
          telefono: "600000000",
          correo: "test@example.com",
          direccion: {
            direccion: "Calle Test 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079"
          }
        }]
      }]
    };

    console.log('📤 Generando XML de prueba...');
    const xmlAlta = generateTestXML(datosPrueba);
    console.log('📝 XML generado (primeros 500 chars):', xmlAlta.substring(0, 500));
    
    console.log('📤 Enviando datos de prueba al MIR...');
    
    const resultado = await client.altaPV({ xmlAlta });
    
    console.log('✅ Resultado del test de conexión:', resultado);

    if (resultado.ok) {
      return NextResponse.json({
        success: true,
        message: '✅ Conexión exitosa con el MIR',
        resultado: resultado,
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          aplicacion: config.aplicacion
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '❌ Conexión fallida: ' + (resultado.descripcion || 'Error desconocido'),
        resultado: resultado,
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          aplicacion: config.aplicacion
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error en test de conexión:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test de conexión',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

