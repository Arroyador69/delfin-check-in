import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { updateMirComunicacion } from '@/lib/mir-db';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🚫 Anulación oficial de lote MIR iniciada...');
    
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

    const { lote, referencia } = json;
    
    if (!lote) {
      return NextResponse.json({
        success: false,
        error: 'Lote requerido',
        message: 'Debe proporcionar el código de lote a anular'
      }, { status: 400 });
    }

    console.log('📋 Anulando lote:', lote, 'referencia:', referencia);

    // Resolver tenant (multi-tenant real): credenciales SIEMPRE desde BD por tenant.
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
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
          message: 'Configura las credenciales MIR del propietario antes de anular lotes.',
        },
        { status: 400 }
      );
    }

    // Configuración del MIR con credenciales correctas
    const config = {
      baseUrl: row.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: String(row.usuario || '').trim().toUpperCase(),
      password: String(row.contraseña || ''),
      codigoArrendador: String(row.codigo_arrendador || '').trim(),
      aplicacion: row.aplicacion || 'Delfin_Check_in',
      simulacion: Boolean(row.simulacion)
    };

    console.log('📋 Configuración MIR oficial para anulación:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      simulacion: config.simulacion
    });

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Anular lote
    const resultado = await client.anulacionLote({ lote });
    
    console.log('✅ Resultado de la anulación oficial:', resultado);

    // Actualizar estado en base de datos si se proporciona referencia
    if (referencia && resultado.ok) {
      try {
        await updateMirComunicacion(referencia, {
          estado: 'anulado',
          resultado: JSON.stringify(resultado),
          error: null
        });
        console.log('💾 Estado actualizado en BD para referencia:', referencia);
      } catch (dbError) {
        console.warn('⚠️ Error actualizando BD:', dbError);
        // No fallar la operación por error de BD
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Anulación oficial completada',
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Lote ${lote} anulado correctamente` : 
          `❌ Error anulando lote: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        lote: lote
      },
      debug: {
        loteAnulado: lote,
        referencia: referencia || 'No proporcionada',
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en anulación oficial:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en anulación oficial',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

