import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codigo = searchParams.get('codigo');
    
    if (!codigo) {
      return NextResponse.json({
        error: 'Código requerido. Uso: /api/debug/codigo-completo?codigo=UUID'
      }, { status: 400 });
    }

    console.log(`🔍 Debugging completo para código: ${codigo}`);

    // 1. Buscar en guest_registrations (exacto)
    const guestExacto = await sql`
      SELECT 
        id, reserva_ref, fecha_entrada, fecha_salida, 
        data, comunicacion_id, tenant_id, created_at
      FROM guest_registrations 
      WHERE reserva_ref = ${codigo} OR comunicacion_id = ${codigo}
      ORDER BY created_at DESC
    `;

    // 2. Buscar en mir_comunicaciones (exacto)
    const mirExacto = await sql`
      SELECT 
        id, referencia, tipo, estado, lote, 
        resultado, error, xml_enviado, xml_respuesta,
        tenant_id, created_at
      FROM mir_comunicaciones 
      WHERE referencia = ${codigo} OR referencia LIKE ${codigo + '%'}
      ORDER BY created_at DESC
    `;

    // 3. Buscar por UUID parcial en guest_registrations
    const guestParcial = await sql`
      SELECT 
        id, reserva_ref, fecha_entrada, fecha_salida, 
        data, comunicacion_id, tenant_id, created_at
      FROM guest_registrations 
      WHERE reserva_ref LIKE '%${codigo}%' OR comunicacion_id LIKE '%${codigo}%'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // 4. Buscar por UUID parcial en mir_comunicaciones
    const mirParcial = await sql`
      SELECT 
        id, referencia, tipo, estado, lote, 
        resultado, error, xml_enviado, xml_respuesta,
        tenant_id, created_at
      FROM mir_comunicaciones 
      WHERE referencia LIKE '%${codigo}%'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // 5. Buscar comunicaciones recientes (últimas 24h)
    const recientes = await sql`
      SELECT 
        gr.id as guest_id, gr.reserva_ref, gr.created_at as guest_created,
        mc.id as mir_id, mc.referencia, mc.tipo, mc.estado, mc.lote,
        mc.created_at as mir_created
      FROM guest_registrations gr
      LEFT JOIN mir_comunicaciones mc ON (
        gr.reserva_ref = mc.referencia OR 
        gr.comunicacion_id = mc.referencia OR
        mc.referencia LIKE gr.reserva_ref || '%'
      )
      WHERE gr.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY gr.created_at DESC
      LIMIT 20
    `;

    // 6. Extraer información del data JSON si existe
    let dataInfo = null;
    if (guestExacto.rows.length > 0) {
      try {
        const data = guestExacto.rows[0].data;
        dataInfo = {
          mir_status: data?.mir_status || null,
          nombres: data?.comunicaciones?.[0]?.personas?.map(p => `${p.nombre} ${p.apellido1}`) || null,
          fecha_entrada: data?.comunicaciones?.[0]?.contrato?.fechaEntrada || null,
          fecha_salida: data?.comunicaciones?.[0]?.contrato?.fechaSalida || null
        };
      } catch (e) {
        dataInfo = { error: 'Error parsing data JSON' };
      }
    }

    const debugInfo = {
      codigo_buscado: codigo,
      timestamp: new Date().toISOString(),
      resultados: {
        guest_registrations_exacto: guestExacto.rows,
        mir_comunicaciones_exacto: mirExacto.rows,
        guest_registrations_parcial: guestParcial.rows,
        mir_comunicaciones_parcial: mirParcial.rows,
        comunicaciones_recientes: recientes.rows
      },
      data_extraido: dataInfo,
      estadisticas: {
        total_guest_exacto: guestExacto.rows.length,
        total_mir_exacto: mirExacto.rows.length,
        total_guest_parcial: guestParcial.rows.length,
        total_mir_parcial: mirParcial.rows.length,
        total_recientes: recientes.rows.length
      },
      recomendaciones: []
    };

    // Generar recomendaciones
    if (guestExacto.rows.length === 0 && mirExacto.rows.length === 0) {
      debugInfo.recomendaciones.push('❌ Código no encontrado en BD local');
      debugInfo.recomendaciones.push('💡 Verificar que el código sea correcto');
      debugInfo.recomendaciones.push('💡 Verificar que el registro se haya guardado correctamente');
    }

    if (guestExacto.rows.length > 0 && mirExacto.rows.length === 0) {
      debugInfo.recomendaciones.push('⚠️ Registro existe pero no hay comunicación MIR');
      debugInfo.recomendaciones.push('💡 Verificar que el envío al MIR haya sido exitoso');
    }

    if (mirExacto.rows.length > 0) {
      const mir = mirExacto.rows[0];
      if (mir.estado === 'enviado') {
        debugInfo.recomendaciones.push('✅ Comunicación enviada al MIR');
        debugInfo.recomendaciones.push('💡 El MIR puede tardar en procesar (hasta 24h)');
        debugInfo.recomendaciones.push('💡 Verificar que el lote sea correcto: ' + mir.lote);
      }
    }

    console.log('🔍 Debug completo:', JSON.stringify(debugInfo, null, 2));

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('❌ Error en debug completo:', error);
    return NextResponse.json({
      error: 'Error interno',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}
