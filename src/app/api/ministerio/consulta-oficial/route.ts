import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consulta oficial de comunicaciones MIR iniciada...');
    
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

    const { codigos } = json;
    
    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Códigos de comunicación requeridos',
        message: 'Debe proporcionar un array de códigos de comunicación'
      }, { status: 400 });
    }

    console.log('📋 Consultando códigos:', codigos);

    // Procesar códigos para cumplir con maxLength de 36 caracteres del MIR
    const codigosProcesados = codigos.map(codigo => {
      // Si el código tiene formato REF-UUID-timestamp, extraer solo el UUID
      if (codigo.startsWith('REF-') && codigo.length > 36) {
        const parts = codigo.split('-');
        if (parts.length >= 5) {
          // Extraer UUID: REF-UUID-timestamp -> UUID
          const uuid = parts.slice(1, 5).join('-'); // UUID tiene 4 partes separadas por -
          console.log(`🔧 Procesando código: ${codigo} -> ${uuid}`);
          return uuid;
        }
      }
      // Si ya es de 36 caracteres o menos, usar tal como está
      return codigo.length <= 36 ? codigo : codigo.substring(0, 36);
    });

    console.log('📋 Códigos procesados para MIR:', codigosProcesados);

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
          message: 'Configura las credenciales MIR del propietario antes de consultar comunicaciones.',
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

    console.log('📋 Configuración MIR oficial para consulta:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      simulacion: config.simulacion
    });

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // PRIMERO: Buscar el código de lote en BD local
    console.log('🔍 Buscando código de lote en BD local...');
    
    let lotesParaConsultar: string[] = [];
    try {
      const { sql } = await import('@vercel/postgres');
      
      // Buscar lotes asociados a estos códigos
      const loteResult = await sql`
        SELECT DISTINCT mc.lote
        FROM mir_comunicaciones mc
        WHERE (
          mc.referencia = ANY(${codigosProcesados as any})
          OR mc.referencia LIKE ANY(${(codigosProcesados.map((c) => c + '%')) as any})
        )
          AND mc.lote IS NOT NULL
          AND mc.lote != ''
          AND mc.lote != 'SIM-'
        ORDER BY mc.lote ASC
      `;

      lotesParaConsultar = loteResult.rows.map((r) => String(r.lote || '').trim()).filter(Boolean);
      console.log('📋 Lotes encontrados en BD:', lotesParaConsultar);
      
      if (lotesParaConsultar.length === 0) {
        console.log('⚠️ No se encontraron lotes en BD local, intentando consulta directa por código');
        
        // Si no hay lotes, intentar consulta directa por código de comunicación
        const resultado = await client.consultaComunicacion({ codigos: codigosProcesados });
        console.log('✅ Resultado de la consulta oficial:', resultado);
        
        return NextResponse.json({
          success: true,
          message: 'Consulta oficial completada (sin lotes en BD)',
          resultado: {
            exito: resultado.ok,
            codigo: resultado.codigo,
            descripcion: resultado.descripcion,
            comunicaciones: resultado.comunicaciones
          },
          interpretacion: {
            exito: resultado.ok,
            mensaje: resultado.ok ? 
              `✅ Consulta realizada correctamente. Encontradas ${resultado.comunicaciones.length} comunicaciones` : 
              `❌ Error en la consulta: ${resultado.descripcion}`,
            codigo: resultado.codigo,
            totalComunicaciones: resultado.comunicaciones.length
          },
          comunicaciones: resultado.comunicaciones.map(com => ({
            codigo: com.codigo,
            tipo: com.tipo,
            estado: com.estado,
            fechaAlta: com.fechaAlta,
            referencia: com.referencia,
            interpretacion: {
              tipoDescripcion: getTipoDescripcion(com.tipo),
              estadoDescripcion: getEstadoDescripcion(com.estado)
            }
          })),
          debug: {
            codigosConsultados: codigos,
            codigosProcesados: codigosProcesados,
            lotesEncontrados: lotesParaConsultar,
            metodo: 'consultaComunicacion_directa',
            config: {
              baseUrl: config.baseUrl,
              username: config.username,
              codigoArrendador: config.codigoArrendador,
              simulacion: config.simulacion
            }
          }
        });
      }
      
    } catch (dbError) {
      console.error('❌ Error buscando lotes en BD:', dbError);
    }
    
    // SEGUNDO: Consultar por lotes (método correcto según normas MIR)
    console.log('🔍 Consultando por lotes al MIR...');
    const resultado = await client.consultaLote({ lotes: lotesParaConsultar });
    
    console.log('✅ Resultado de la consulta oficial:', resultado);

    // Procesar resultado de consultaLote
    let comunicaciones = [];
    if (resultado.ok && resultado.resultados) {
      // Convertir resultados de lote a formato de comunicaciones
      for (const loteResult of resultado.resultados) {
        if (loteResult.resultadoComunicaciones) {
          for (const comResult of loteResult.resultadoComunicaciones) {
            if (comResult.codigoComunicacion) {
              comunicaciones.push({
                codigo: comResult.codigoComunicacion,
                tipo: loteResult.tipoComunicacion || 'PV',
                estado: loteResult.codigoEstado === '1' ? 'confirmado' : 'pendiente',
                fechaAlta: new Date().toISOString(),
                referencia: loteResult.lote,
                lote: loteResult.lote,
                codigoEstado: loteResult.codigoEstado,
                descEstado: loteResult.descEstado
              });
            }
          }
        }
      }
    }

    // Si el MIR no encuentra comunicaciones, buscar en BD local
    let informacionLocal = null;
    if (resultado.ok && comunicaciones.length === 0) {
      console.log('🔍 MIR no encontró comunicaciones, buscando en BD local...');
      
      try {
        const { sql } = await import('@vercel/postgres');
        
        // Buscar en guest_registrations
        const guestResult = await sql`
          SELECT 
            id, reserva_ref, fecha_entrada, fecha_salida, 
            data, comunicacion_id, tenant_id, created_at
          FROM guest_registrations 
          WHERE reserva_ref = ANY(${codigosProcesados as any}) OR comunicacion_id = ANY(${codigosProcesados as any})
          ORDER BY created_at DESC
        `;

        // Buscar en mir_comunicaciones
        const mirResult = await sql`
          SELECT 
            id, referencia, tipo, estado, lote, 
            resultado, error, xml_enviado, xml_respuesta,
            tenant_id, created_at
          FROM mir_comunicaciones 
          WHERE referencia = ANY(${codigosProcesados as any}) OR referencia LIKE ANY(${(codigosProcesados.map(c => c + '%')) as any})
          ORDER BY created_at DESC
        `;

        informacionLocal = {
          guest_registrations: guestResult.rows,
          mir_comunicaciones: mirResult.rows,
          encontrado_en_bd: guestResult.rows.length > 0 || mirResult.rows.length > 0
        };

        console.log('📊 Información local encontrada:', informacionLocal);
      } catch (dbError) {
        console.error('❌ Error buscando en BD local:', dbError);
        informacionLocal = { error: 'Error consultando BD local' };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consulta oficial completada',
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        comunicaciones: comunicaciones,
        lotes: resultado.resultados || []
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Consulta realizada correctamente. Encontradas ${comunicaciones.length} comunicaciones` : 
          `❌ Error en la consulta: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        totalComunicaciones: comunicaciones.length,
        totalLotes: resultado.resultados?.length || 0
      },
      comunicaciones: comunicaciones.map(com => ({
        codigo: com.codigo,
        tipo: com.tipo,
        estado: com.estado,
        fechaAlta: com.fechaAlta,
        referencia: com.referencia,
        lote: com.lote,
        codigoEstado: com.codigoEstado,
        descEstado: com.descEstado,
        interpretacion: {
          tipoDescripcion: getTipoDescripcion(com.tipo),
          estadoDescripcion: getEstadoDescripcion(com.estado)
        }
      })),
      informacion_local: informacionLocal,
      debug: {
        codigosConsultados: codigos,
        codigosProcesados: codigosProcesados,
        lotesEncontrados: lotesParaConsultar,
        metodo: 'consultaLote',
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en consulta oficial:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en consulta oficial',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function getTipoDescripcion(tipo: string): string {
  const tipos: Record<string, string> = {
    'RH': 'Reserva de Hospedaje',
    'AV': 'Alta de Viajero',
    'PV': 'Parte de Viajero',
    'RV': 'Reserva de Vehículo'
  };
  return tipos[tipo] || `Tipo desconocido: ${tipo}`;
}

function getEstadoDescripcion(estado: string): string {
  const estados: Record<string, string> = {
    'ACTIVA': 'Comunicación activa',
    'ANULADA': 'Comunicación anulada',
    'PENDIENTE': 'Comunicación pendiente',
    'PROCESADA': 'Comunicación procesada'
  };
  return estados[estado] || `Estado desconocido: ${estado}`;
}

