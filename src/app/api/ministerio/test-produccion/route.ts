import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Probando conexión MIR...');
    
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

    // Resolver tenant para poder usar credenciales guardadas si el frontend no envía contraseña (por seguridad).
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    const body = json as Record<string, any>;
    const usuarioRaw = body.usuario;
    const contraseñaRaw = body.contraseña;
    const codigoArrendadorRaw = body.codigoArrendador;
    const baseUrl = body.baseUrl || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion';
    const aplicacion = body.aplicacion || 'Delfin_Check_in';
    const simulacion = Boolean(body.simulacion);

    // Si faltan campos, intentar cargarlos desde BD (multi-tenant real).
    let source: 'body' | 'db' = 'body';
    let usuario = typeof usuarioRaw === 'string' ? usuarioRaw.trim() : '';
    let contraseña = typeof contraseñaRaw === 'string' ? contraseñaRaw : '';
    let codigoArrendador = typeof codigoArrendadorRaw === 'string' ? codigoArrendadorRaw.trim() : '';

    const needsDbFallback = (!usuario || !contraseña || !codigoArrendador) && Boolean(tenantId);
    if (needsDbFallback && tenantId) {
      const r = await sql`
        SELECT usuario, contraseña, codigo_arrendador, base_url, aplicacion, simulacion, activo
        FROM mir_configuraciones
        WHERE (propietario_id = ${tenantId} OR tenant_id = ${tenantId})
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      const row = r.rows[0];
      if (row) {
        source = 'db';
        if (!usuario) usuario = String(row.usuario || '').trim();
        if (!contraseña) contraseña = String(row.contraseña || '');
        if (!codigoArrendador) codigoArrendador = String(row.codigo_arrendador || '').trim();
      }
    }

    // Validaciones
    const missing: string[] = [];
    if (!usuario) missing.push('usuario');
    if (!contraseña) missing.push('contraseña');
    if (!codigoArrendador) missing.push('codigoArrendador');

    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales incompletas',
        message:
          `Faltan: ${missing.join(', ')}. ` +
          (tenantId
            ? 'Si ya estaban guardadas, vuelve a Guardar en Configuración → MIR (la contraseña no se auto-rellena por seguridad).'
            : 'Inicia sesión para probar con las credenciales guardadas del tenant.'),
        missing,
        source,
      }, { status: 400 });
    }

    const usuarioNorm = String(usuario).trim().toUpperCase();
    const codigoArrendadorNorm = String(codigoArrendador).trim();

    console.log('📋 Probando conexión con credenciales:', {
      usuario: usuarioNorm,
      codigoArrendador: codigoArrendadorNorm,
      baseUrl,
      simulacion
    });

    // Configuración del MIR
    const config = {
      baseUrl,
      username: usuarioNorm,
      password: contraseña,
      codigoArrendador: codigoArrendadorNorm,
      aplicacion,
      simulacion
    };

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Probar conexión consultando un catálogo (si auth falla, aquí devuelve diagnóstico).
    const resultado = await client.consultaCatalogo({ catalogo: 'TIPOS_DOCUMENTO' });
    
    console.log('✅ Resultado de la prueba de conexión:', resultado);

    const ok = Boolean(resultado?.ok);
    const probableCauses: string[] = [];
    const code = String(resultado?.codigo || '');
    const desc = String(resultado?.descripcion || '');

    if (!ok) {
      if (code === '401' || code === '403') {
        probableCauses.push('Usuario/contraseña WS incorrectos o sin permisos de Servicio Web en SES Hospedajes.');
      }
      if (desc.toLowerCase().includes('credenciales') || desc.toLowerCase().includes('basic')) {
        probableCauses.push('Credenciales WS inválidas (revisa “Servicio de Comunicación” en SES Hospedajes).');
      }
      if (code === 'NETWORK_ERROR' || desc.toLowerCase().includes('conect')) {
        probableCauses.push('Problema de conectividad con el MIR (URL/baseUrl, red, timeout).');
      }
      probableCauses.push('Asegúrate de haber marcado “Envío de comunicaciones por servicio web” al dar de alta la entidad.');
    }

    return NextResponse.json({
      success: ok,
      message: ok ? 'Prueba de conexión completada' : 'Prueba de conexión fallida',
      resultado: {
        exito: ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        elementos: resultado.elementos?.length || 0
      },
      interpretacion: {
        exito: ok,
        mensaje: ok ? 
          `✅ Conexión exitosa con el MIR. Catálogo consultado correctamente. Encontrados ${resultado.elementos?.length || 0} elementos` : 
          `❌ Error en la conexión: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        detalles: {
          configuracion: {
            baseUrl: config.baseUrl,
            usuario: config.username,
            codigoArrendador: config.codigoArrendador,
            simulacion: config.simulacion
          },
          respuesta: {
            codigo: resultado.codigo,
            descripcion: resultado.descripcion,
            elementosEncontrados: resultado.elementos?.length || 0
          }
        }
      },
      probableCauses: ok ? [] : probableCauses,
      source,
      debug: {
        configuracion: {
          baseUrl: config.baseUrl,
          usuario: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        },
        respuesta: {
          ok: resultado?.ok,
          codigo: resultado?.codigo,
          descripcion: resultado?.descripcion,
          elementos: resultado?.elementos?.length || 0,
          rawResponsePreview: (resultado as any)?.rawResponse
            ? String((resultado as any).rawResponse).substring(0, 700)
            : undefined,
        }
      }
    }, { status: ok ? 200 : 400 });

  } catch (error) {
    console.error('❌ Error en prueba de conexión MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en prueba de conexión MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      interpretacion: {
        exito: false,
        mensaje: `❌ Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        detalles: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}