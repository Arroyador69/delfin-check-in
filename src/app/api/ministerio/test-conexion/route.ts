import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClient } from '@/lib/ministerio-client';

/**
 * Test de conexión al MIR
 * Verifica que las credenciales estén configuradas correctamente
 */
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

    // Crear cliente MIR
    const client = new MinisterioClient(config);
    
    // Intentar un envío de prueba simple
    const referencia = `TEST-CON-${Date.now()}`;
    const datosPrueba = {
      codigoEstablecimiento: "0000256653",
      comunicaciones: [{
        contrato: {
          referencia: referencia,
          fechaContrato: new Date().toISOString().split('T')[0],
          fechaEntrada: new Date().toISOString(),
          fechaSalida: new Date(Date.now() + 24*60*60*1000).toISOString(),
          numPersonas: 1,
          numHabitaciones: 1,
          internet: false,
          pago: {
            tipoPago: "EFECT",
            fechaPago: new Date().toISOString().split('T')[0]
          }
        },
        personas: [{
          rol: "VI",
          nombre: "TEST",
          apellido1: "CONEXION",
          apellido2: "MIR",
          tipoDocumento: "NIF",
          numeroDocumento: "12345678Z",
          fechaNacimiento: "1985-01-01",
          nacionalidad: "ESP",
          sexo: "M",
          telefono: "600000000",
          correo: "test@example.com",
          direccion: {
            direccion: "Calle Test 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079",
            nombreMunicipio: "Madrid"
          }
        }]
      }]
    };

    console.log('📤 Enviando datos de prueba al MIR...');
    
    const resultado = await client.altaPV(datosPrueba);
    
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
        message: '❌ Conexión fallida: ' + (resultado.error || 'Error desconocido'),
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

