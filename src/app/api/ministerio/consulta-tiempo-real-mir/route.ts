import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consulta en tiempo real con el MIR...');

    // Verificar configuración MIR
    const config = {
      baseUrl: process.env.MIR_BASE_URL,
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: process.env.MIR_SIMULACION === 'true' || !process.env.MIR_BASE_URL
    };

    console.log('🔧 Configuración MIR:', {
      baseUrl: config.baseUrl ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      simulacion: config.simulacion,
      username: config.username ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      codigoArrendador: config.codigoArrendador ? 'CONFIGURADO' : 'NO_CONFIGURADO'
    });

    // Si está en modo simulación o no hay configuración, simular respuesta
    if (config.simulacion || !config.baseUrl) {
      console.log('⚠️ Modo simulación activado - simulando consulta MIR');
      
      const lotesSimulados = [
        { lote: 'LOTE-SIM-001', codigoEstado: '1', descripcion: 'Confirmado por el MIR' },
        { lote: 'LOTE-SIM-002', codigoEstado: '4', descripcion: 'Pendiente de procesamiento' }
      ];

      return NextResponse.json({
        success: true,
        mensaje: `Consulta simulada completada - ${lotesSimulados.length} lotes consultados, ${lotesSimulados.length} actualizados`,
        lotesConsultados: lotesSimulados.length,
        actualizados: lotesSimulados.length,
        detalles: lotesSimulados,
        timestamp: new Date().toISOString(),
        simulacion: true
      });
    }

    // Importar cliente MIR solo si no está en simulación
    const { MinisterioClient } = await import('@/lib/ministerio-client');
    const cliente = new MinisterioClient(config);

    // Obtener todos los lotes que necesitan verificación
    const result = await sql`
      SELECT 
        mc.id,
        mc.referencia,
        mc.lote,
        mc.estado as mir_estado,
        mc.created_at as fecha_envio
      FROM mir_comunicaciones mc
      WHERE mc.lote IS NOT NULL AND mc.lote != ''
      ORDER BY mc.created_at DESC
      LIMIT 10
    `;

    console.log(`📋 Encontrados ${result.rows.length} lotes para consultar`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes para consultar',
        consultados: 0,
        actualizados: 0
      });
    }

    // Obtener lotes únicos para consultar
    const lotesUnicos = [...new Set(result.rows.map(r => r.lote).filter(Boolean))];
    
    if (lotesUnicos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes válidos para consultar',
        consultados: 0,
        actualizados: 0
      });
    }

    console.log(`🔍 Consultando ${lotesUnicos.length} lotes únicos al MIR en tiempo real:`, lotesUnicos);

    // Consultar lotes al MIR usando el servicio oficial consultaLote
    const resultado = await cliente.consultaLote({ lotes: lotesUnicos });
    
    console.log('📊 Resultado consulta MIR en tiempo real:', resultado);

    if (!resultado.ok) {
      console.error('❌ Error en consulta MIR:', resultado.descripcion);
      return NextResponse.json({
        success: false,
        error: `Error del MIR: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion
      }, { status: 500 });
    }

    // Procesar resultados y actualizar base de datos en tiempo real
    const actualizados = [];
    let totalActualizados = 0;

    if (resultado.resultados && resultado.resultados.length > 0) {
      for (const loteResult of resultado.resultados) {
        // Determinar el nuevo estado según el código MIR oficial
        let nuevoEstado = 'enviado';
        let descripcionEstado = 'Enviado al MIR';

        switch (loteResult.codigoEstado) {
          case '1': // Procesado correctamente
            nuevoEstado = 'confirmado';
            descripcionEstado = 'Confirmado por el MIR - Procesado correctamente';
            break;
          case '4': // Pendiente de procesamiento
            nuevoEstado = 'enviado';
            descripcionEstado = 'Pendiente de procesamiento por el MIR';
            break;
          case '5': // Error en procesamiento
            nuevoEstado = 'error';
            descripcionEstado = 'Error en procesamiento por el MIR';
            break;
          case '6': // Anulado
            nuevoEstado = 'error';
            descripcionEstado = 'Comunicación anulada por el MIR';
            break;
        }

        // Actualizar la tabla mir_comunicaciones con estado en tiempo real
        await sql`
          UPDATE mir_comunicaciones 
          SET 
            estado = ${nuevoEstado},
            resultado = jsonb_set(
              COALESCE(resultado, '{}'::jsonb),
              '{codigoEstado}', 
              ${loteResult.codigoEstado}::jsonb
            ),
            resultado = jsonb_set(
              resultado,
              '{descEstado}', 
              ${descripcionEstado}::jsonb
            ),
            resultado = jsonb_set(
              resultado,
              '{ultimaConsulta}', 
              ${new Date().toISOString()}::jsonb
            )
          WHERE lote = ${loteResult.lote}
        `;

        // Actualizar también guest_registrations para sincronización completa
        await sql`
          UPDATE guest_registrations 
          SET data = jsonb_set(
            COALESCE(data, '{}'::jsonb),
            '{mir_status}',
            jsonb_build_object(
              'estado', ${nuevoEstado},
              'lote', ${loteResult.lote},
              'codigoEstado', ${loteResult.codigoEstado},
              'descEstado', ${descripcionEstado},
              'ultimaConsulta', ${new Date().toISOString()}
            )
          )
          WHERE reserva_ref IN (
            SELECT referencia FROM mir_comunicaciones WHERE lote = ${loteResult.lote}
          )
        `;

        actualizados.push({
          lote: loteResult.lote,
          codigoEstado: loteResult.codigoEstado,
          nuevoEstado,
          descripcion: descripcionEstado
        });

        totalActualizados++;
        console.log(`✅ Actualizado lote ${loteResult.lote}: ${nuevoEstado} (${loteResult.codigoEstado})`);
      }
    } else {
      console.log('⚠️ No se encontraron resultados en la respuesta del MIR');
    }

    console.log(`📝 Se actualizaron ${totalActualizados} comunicaciones en tiempo real`);

    return NextResponse.json({
      success: true,
      mensaje: `Consulta en tiempo real realizada correctamente - ${lotesUnicos.length} lotes consultados, ${totalActualizados} actualizados`,
      lotesConsultados: lotesUnicos.length,
      actualizados: totalActualizados,
      detalles: actualizados,
      timestamp: new Date().toISOString(),
      consultaTiempoReal: true
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error consultando MIR en tiempo real:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno consultando MIR en tiempo real',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
