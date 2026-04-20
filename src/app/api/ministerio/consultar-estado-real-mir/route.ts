import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consultando estado real con el MIR...');

    // Resolver tenant (multi-tenant real): credenciales desde BD por tenant.
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todos los lotes que están en estado "enviado" para consultar su estado real
    const result = await sql`
      SELECT 
        mc.id,
        mc.referencia,
        mc.lote,
        mc.estado as mir_estado,
        mc.created_at as fecha_envio,
        gr.id as registro_id,
        gr.data
      FROM mir_comunicaciones mc
      LEFT JOIN guest_registrations gr ON mc.referencia = gr.reserva_ref
      WHERE mc.estado = 'enviado' AND mc.lote IS NOT NULL
        AND (mc.tenant_id = ${tenantId} OR gr.tenant_id = ${tenantId})
      ORDER BY mc.created_at DESC
      LIMIT 200
    `;

    console.log(`📋 Encontrados ${result.rows.length} lotes para consultar`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes enviados para consultar',
        consultados: 0,
        actualizados: 0
      });
    }

    const cfgRes = await sql`
      SELECT usuario, contraseña, codigo_arrendador, base_url, aplicacion, simulacion, activo
      FROM mir_configuraciones
      WHERE propietario_id = ${tenantId} OR tenant_id = ${tenantId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const row = cfgRes.rows[0];
    if (!row || row.activo === false) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales MIR no configuradas',
          code: 'MIR_CREDENTIALS_MISSING',
          message: 'Configura las credenciales MIR del propietario antes de consultar estados reales.',
        },
        { status: 400 }
      );
    }

    // Configurar cliente MIR (misma operación; solo cambia la fuente de credenciales)
    const config = {
      baseUrl: row.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: String(row.usuario || '').trim().toUpperCase(),
      password: String(row.contraseña || ''),
      codigoArrendador: String(row.codigo_arrendador || '').trim(),
      aplicacion: row.aplicacion || 'Delfin_Check_in',
      simulacion: Boolean(row.simulacion),
    };
    const cliente = new MinisterioClientOfficial(config);

    // Obtener lotes únicos para consultar (priorizando los más recientes).
    // IMPORTANTE: limitar por ejecución para evitar timeouts en serverless.
    const lotesUnicosAll = [...new Set(result.rows.map(r => r.lote).filter(Boolean))];
    const maxLotesPorEjecucion = 20; // 2 chunks de 10, seguro para producción
    const lotesUnicos = lotesUnicosAll.slice(0, maxLotesPorEjecucion);
    
    if (lotesUnicos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes válidos para consultar',
        consultados: 0,
        actualizados: 0
      });
    }

    console.log(`🔍 Consultando ${lotesUnicos.length}/${lotesUnicosAll.length} lotes únicos al MIR`);

    // El MIR limita el nº de lotes por petición (históricamente 10). Hacemos batching.
    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < lotesUnicos.length; i += chunkSize) {
      chunks.push(lotesUnicos.slice(i, i + chunkSize));
    }

    const resultadosAgregados: NonNullable<(Awaited<ReturnType<typeof cliente.consultaLote>>)['resultados']> = [];
    for (const [idx, chunk] of chunks.entries()) {
      console.log(`📦 Consultando chunk ${idx + 1}/${chunks.length} (${chunk.length} lotes)`);
      const r = await cliente.consultaLote({ lotes: chunk });
      if (!r.ok) {
        console.error('❌ Error en consulta MIR (chunk):', {
          idx: idx + 1,
          total: chunks.length,
          codigo: r.codigo,
          descripcion: r.descripcion,
        });
        return NextResponse.json(
          {
            success: false,
            error: `Error del MIR: ${r.descripcion}`,
            codigo: r.codigo,
            descripcion: r.descripcion,
          },
          { status: 500 }
        );
      }
      if (r.resultados?.length) {
        resultadosAgregados.push(...r.resultados);
      }
    }

    const resultado = {
      ok: true,
      codigo: '0',
      descripcion: 'Ok',
      resultados: resultadosAgregados,
      rawResponse: '',
    } as const;

    // Procesar resultados y actualizar base de datos
    const actualizados = [];
    let totalActualizados = 0;

    if (resultado.resultados) {
      for (const loteResult of resultado.resultados) {
        const nowIso = new Date().toISOString();
        // Determinar el nuevo estado según el código MIR oficial
        let nuevoEstado = 'enviado';
        let descripcionEstado = 'Enviado al MIR';

        switch (loteResult.codigoEstado) {
          case '1': // Procesado correctamente
            nuevoEstado = 'confirmado';
            descripcionEstado = 'Confirmado por el MIR';
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

        // Actualizar la tabla mir_comunicaciones
        await sql`
          UPDATE mir_comunicaciones 
          SET 
            estado = ${nuevoEstado},
            resultado = COALESCE(resultado, '{}'::jsonb) ||
              jsonb_build_object(
                'codigoEstado', ${String(loteResult.codigoEstado ?? '')},
                'descEstado', ${descripcionEstado},
                'ultimaConsulta', ${nowIso}
              )
          WHERE lote = ${loteResult.lote}
        `;

        // Actualizar también guest_registrations para sincronización
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
              'ultimaConsulta', ${nowIso}
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
    }

    console.log(`📝 Se actualizaron ${totalActualizados} comunicaciones`);

    return NextResponse.json({
      success: true,
      mensaje: `Consulta realizada correctamente - ${lotesUnicos.length} lotes consultados, ${totalActualizados} actualizados`,
      lotesConsultados: lotesUnicos.length,
      actualizados: totalActualizados,
      detalles: actualizados,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error consultando estado real MIR:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno consultando estado MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

