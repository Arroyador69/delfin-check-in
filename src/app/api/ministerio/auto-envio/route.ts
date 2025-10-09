import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClient } from '@/lib/ministerio-client';
import { insertMirComunicacion, updateMirComunicacion, MirComunicacion } from '@/lib/mir-db';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Auto-envío al MIR iniciado...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('📋 Datos recibidos para auto-envío:', JSON.stringify(json, null, 2));

    // Configuración del MIR - ENVÍO REAL
    // Las credenciales DEBEN estar en variables de entorno (Vercel/local .env)
    const config = {
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: false // ENVÍO REAL AL MIR
    };

    // Crear cliente MIR
    const client = new MinisterioClient(config);
    
    // Generar referencia única
    const referencia = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Preparar datos para el MIR
    const datosMIR = {
      codigoEstablecimiento: "0000256653",
      comunicaciones: [{
        contrato: {
          referencia: referencia,
          fechaContrato: new Date().toISOString().split('T')[0],
          fechaEntrada: json.fechaEntrada || new Date().toISOString(),
          fechaSalida: json.fechaSalida || new Date(Date.now() + 24*60*60*1000).toISOString(),
          numPersonas: json.personas?.length || 1,
          numHabitaciones: 1,
          internet: false,
          pago: {
            tipoPago: "EFECT",
            fechaPago: new Date().toISOString().split('T')[0]
          }
        },
        personas: json.personas || [{
          rol: "VI",
          nombre: json.nombre || "Viajero",
          apellido1: json.apellido1 || "Apellido1",
          apellido2: json.apellido2 || "",
          tipoDocumento: json.tipoDocumento || "NIF",
          numeroDocumento: json.numeroDocumento || "12345678Z",
          fechaNacimiento: json.fechaNacimiento || "1985-01-01",
          nacionalidad: json.nacionalidad || "ESP",
          sexo: json.sexo || "M",
          telefono: json.telefono || "600000000",
          correo: json.correo || "viajero@example.com",
          direccion: {
            direccion: json.direccion || "Calle Ejemplo 123",
            codigoPostal: json.codigoPostal || "28001",
            pais: json.pais || "ESP",
            codigoMunicipio: json.codigoMunicipio || "28079"
          }
        }]
      }]
    };

    console.log('📤 Enviando datos al MIR:', JSON.stringify(datosMIR, null, 2));

    // Enviar al MIR
    const resultado = await client.altaPV(datosMIR);
    
    console.log('✅ Resultado del envío al MIR:', resultado);

    // Guardar comunicación en base de datos
    const comunicacion: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
      referencia: referencia,
      timestamp: new Date().toISOString(),
      datos: datosMIR,
      resultado: resultado,
      estado: resultado.ok ? 'enviado' : 'error',
      lote: resultado.lote || null,
      error: resultado.error || null,
      codigo_establecimiento: "0000256653",
      fecha_entrada: datosMIR.comunicaciones[0].contrato.fechaEntrada,
      fecha_salida: datosMIR.comunicaciones[0].contrato.fechaSalida,
      num_personas: datosMIR.comunicaciones[0].contrato.numPersonas
    };

    const id = await insertMirComunicacion(comunicacion);
    console.log('✅ Comunicación guardada en BD con ID:', id);

    return NextResponse.json({
      success: true,
      message: 'Auto-envío al MIR completado',
      referencia: referencia,
      resultado: resultado,
      estado: resultado.ok ? 'enviado' : 'error',
      lote: resultado.lote || null
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en auto-envío al MIR:', error);
    
    // Guardar error en base de datos
    const referencia = `ERROR-${Date.now()}`;
    const comunicacion: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
      referencia: referencia,
      timestamp: new Date().toISOString(),
      datos: json || {},
      resultado: null,
      estado: 'error',
      lote: null,
      error: error instanceof Error ? error.message : 'Error desconocido',
      codigo_establecimiento: "0000256653",
      fecha_entrada: json?.fechaEntrada || new Date().toISOString(),
      fecha_salida: json?.fechaSalida || new Date(Date.now() + 24*60*60*1000).toISOString(),
      num_personas: json?.personas?.length || 1
    };

    try {
      await insertMirComunicacion(comunicacion);
    } catch (saveError) {
      console.error('❌ Error guardando comunicación de error:', saveError);
    }

    return NextResponse.json({
      success: false,
      error: 'Error en auto-envío al MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      referencia: referencia
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
