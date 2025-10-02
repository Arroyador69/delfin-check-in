import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClient } from '@/lib/ministerio-client';
import { insertMirComunicacion, MirComunicacion } from '@/lib/mir-db';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test envío REAL al MIR iniciado...');
    
    // Configuración del MIR - ENVÍO REAL
    const config = {
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '27380387Z',
      password: process.env.MIR_HTTP_PASS || 'Marazulado_',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '0000146962',
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: false // ENVÍO REAL AL MIR
    };

    console.log('📋 Configuración MIR:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      aplicacion: config.aplicacion,
      simulacion: config.simulacion
    });

    // Datos de prueba
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
    
    console.log('📤 Datos de prueba:', JSON.stringify(testData, null, 2));
    
    // Crear cliente MIR
    const client = new MinisterioClient(config);
    
    // Enviar al MIR
    const resultado = await client.altaPV(testData);
    
    console.log('✅ Resultado del envío REAL al MIR:', resultado);
    
    // Guardar en base de datos
    const comunicacion: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
      referencia: testData.comunicaciones[0].contrato.referencia,
      timestamp: new Date().toISOString(),
      datos: testData,
      resultado: resultado,
      estado: resultado.ok ? 'enviado' : 'error',
      lote: resultado.lote || null,
      error: resultado.error || null,
      codigo_establecimiento: "0000256653",
      fecha_entrada: testData.comunicaciones[0].contrato.fechaEntrada,
      fecha_salida: testData.comunicaciones[0].contrato.fechaSalida,
      num_personas: testData.comunicaciones[0].contrato.numPersonas
    };

    const id = await insertMirComunicacion(comunicacion);
    console.log('✅ Comunicación guardada en BD con ID:', id);
    
    return NextResponse.json({
      success: true,
      message: 'Test envío REAL al MIR completado',
      config: {
        baseUrl: config.baseUrl,
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion
      },
      resultado: resultado,
      referencia: testData.comunicaciones[0].contrato.referencia,
      lote: resultado.lote || null,
      estado: resultado.ok ? 'enviado' : 'error',
      id: id
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test envío REAL al MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test envío REAL al MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
