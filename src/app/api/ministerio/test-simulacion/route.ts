import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientVercel } from '@/lib/ministerio-client-vercel';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test MIR en modo SIMULACIÓN...');
    
    // Configuración del MIR - MODO SIMULACIÓN
    const config = {
      baseUrl: process.env.MIR_BASE_URL!,
      username: process.env.MIR_HTTP_USER!,
      password: process.env.MIR_HTTP_PASS!,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR!,
      aplicacion: process.env.MIR_APLICACION!,
      simulacion: true // MODO SIMULACIÓN
    };

    console.log('🔧 Configuración MIR (SIMULACIÓN):', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      aplicacion: config.aplicacion,
      simulacion: config.simulacion
    });

    // Crear cliente MIR (versión Vercel)
    const client = new MinisterioClientVercel(config);
    
    // Datos de prueba
    const referencia = `TEST-SIM-${Date.now()}`;
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
          apellido1: "SIMULACION",
          apellido2: "MIR",
          tipoDocumento: "NIF",
          numeroDocumento: "12345678Z",
          soporteDocumento: "C",
          fechaNacimiento: "1985-01-01",
          nacionalidad: "ESP",
          sexo: "H",
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

    console.log('📤 Enviando datos de prueba al MIR (SIMULACIÓN)...');
    
    const resultado = await client.altaPV(datosPrueba);
    
    console.log('✅ Resultado del test de simulación:', resultado);

    return NextResponse.json({
      success: true,
      message: '✅ Test de simulación MIR exitoso',
      simulacion: true,
      resultado: resultado,
      config: {
        baseUrl: config.baseUrl,
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test de simulación:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test de simulación',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
