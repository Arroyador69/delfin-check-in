import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo registros para test MIR...');
    
    // Obtener los últimos 5 registros de guest_registrations
    const result = await sql`
      SELECT 
        id,
        created_at,
        fecha_entrada,
        fecha_salida,
        data,
        reserva_ref
      FROM guest_registrations 
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    console.log(`📋 Encontrados ${result.rows.length} registros`);
    
    // Procesar registros
    const registros = result.rows.map((row: any) => {
      const data = row.data || {};
      const mirStatus = data.mir_status || {};
      
      return {
        id: row.id,
        timestamp: row.created_at,
        fecha_entrada: row.fecha_entrada,
        fecha_salida: row.fecha_salida,
        reserva_ref: row.reserva_ref,
        nombre: data.nombre || 'N/A',
        apellido1: data.apellido1 || 'N/A',
        telefono: data.telefono || 'N/A',
        email: data.email || 'N/A',
        mir_status: mirStatus,
        estado_mir: mirStatus.error ? 'error' : 
                    mirStatus.codigoComunicacion ? 'confirmado' :
                    mirStatus.lote ? 'enviado' : 'pendiente'
      };
    });
    
    return NextResponse.json({
      success: true,
      registros,
      total: registros.length,
      timestamp: new Date().toISOString(),
      resumen: {
        pendientes: registros.filter(r => r.estado_mir === 'pendiente').length,
        enviados: registros.filter(r => r.estado_mir === 'enviado').length,
        confirmados: registros.filter(r => r.estado_mir === 'confirmado').length,
        errores: registros.filter(r => r.estado_mir === 'error').length
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo registros:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo registros',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Reenviando registro al MIR...');
    
    const json = await req.json().catch(() => ({}));
    const { registroId } = json;
    
    if (!registroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de registro requerido',
        message: 'Debe proporcionar registroId'
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
        error: 'Registro no encontrado',
        message: `No se encontró el registro con ID ${registroId}`
      }, { status: 404 });
    }
    
    const row = result.rows[0];
    const data = row.data || {};
    
    // Configuración MIR
    const config = {
      baseUrl: process.env.MIR_BASE_URL || '',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in',
      simulacion: false
    };
    
    // Preparar datos para el MIR con formato correcto para alt:peticion
    const datosMIR = {
      codigoEstablecimiento: config.codigoArrendador,
      comunicaciones: [{
        contrato: {
          referencia: `REENVIO-${row.id}-${Date.now()}`,
          fechaContrato: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          fechaEntrada: (row.fecha_entrada || new Date().toISOString()).replace('Z', ''), // YYYY-MM-DDTHH:mm:ss
          fechaSalida: (row.fecha_salida || new Date(Date.now() + 24*60*60*1000).toISOString()).replace('Z', ''), // YYYY-MM-DDTHH:mm:ss
          numPersonas: 1,
          pago: {
            tipoPago: "EFECT"
          }
        },
        personas: [{
          rol: "VI", // Viajero
          nombre: (data.nombre || "Viajero").trim().toUpperCase(),
          apellido1: (data.apellido1 || "Apellido1").trim().toUpperCase(),
          apellido2: (data.apellido2 || "Apellido2").trim().toUpperCase(), // Obligatorio para NIF
          tipoDocumento: data.tipoDocumento || "NIF",
          numeroDocumento: (data.numeroDocumento || "12345678Z").trim().toUpperCase(),
          fechaNacimiento: data.fechaNacimiento || "1985-01-01", // YYYY-MM-DD
          direccion: {
            direccion: (data.direccion || "Calle Ejemplo 123").trim(),
            codigoPostal: (data.codigoPostal || "28001").trim(),
            pais: (data.pais || "ESP").trim().toUpperCase(), // ISO3
            codigoMunicipio: data.codigoMunicipio || "28079" // INE si país=ESP
          },
          correo: data.email || "viajero@example.com" // Al menos uno: teléfono, teléfono2 o correo
        }]
      }]
    };
    
    console.log('📤 Reenviando registro al MIR:', {
      registroId,
      referencia: datosMIR.comunicaciones[0].contrato.referencia,
      nombre: data.nombre
    });
    
    // Importar y usar el cliente MIR con el generador PV correcto
    const { MinisterioClientFixed } = await import('@/lib/ministerio-client-fixed');
    const { buildAltaPVXml } = await import('@/lib/mir-xml-pv');
    const { getMinisterioConfigFromEnv } = await import('@/lib/ministerio-client-fixed');
    
    const mirConfig = getMinisterioConfigFromEnv();
    const client = new MinisterioClientFixed(mirConfig);
    
    // Generar XML usando el generador PV correcto (alt:peticion)
    const xmlContent = buildAltaPVXml(datosMIR);
    
    // Enviar al MIR
    const resultado = await client.altaPV({ xmlAlta: xmlContent });
    
    console.log('✅ Resultado reenvío MIR:', resultado);
    
    // Actualizar el registro con el resultado
    const nuevoMirStatus = {
      ...data.mir_status,
      lote: resultado.lote || null,
      error: resultado.ok ? null : resultado.descripcion || 'Error desconocido',
      codigoComunicacion: resultado.codigoComunicacion || null,
      timestamp: new Date().toISOString(),
      resultado: resultado
    };
    
    await sql`
      UPDATE guest_registrations 
      SET data = jsonb_set(data, '{mir_status}', ${JSON.stringify(nuevoMirStatus)})
      WHERE id = ${registroId}
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Registro reenviado al MIR',
      registroId,
      referencia: datosMIR.comunicaciones[0].contrato.referencia,
      resultado: resultado,
      lote: resultado.lote || null,
      estado: resultado.ok ? 'enviado' : 'error',
      interpretacion: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        lote: resultado.lote ? `Lote asignado: ${resultado.lote}` : 'Sin lote asignado'
      }
    });
    
  } catch (error) {
    console.error('❌ Error reenviando registro al MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error reenviando registro al MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}




