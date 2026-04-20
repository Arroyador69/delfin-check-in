import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando configuración MIR...');

    // Obtener tenant_id autenticado (robusto multi-tenant). Header solo como fallback.
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Preferir modelo multi (mir_credenciales). Si existe al menos 1 activa, esa es la “config principal”.
    try {
      const { ensureMirMultiSchema } = await import('@/lib/mir-multi');
      await ensureMirMultiSchema();
      const multi = await sql`
        SELECT usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, activo
        FROM mir_credenciales
        WHERE tenant_id = ${tenantId}::uuid
          AND activo = true
        ORDER BY created_at ASC, id ASC
        LIMIT 1
      `;
      if (multi.rows.length > 0) {
        const r = multi.rows[0] as any;
        const cfg = {
          usuario: r.usuario || '',
          contraseña: r.contraseña || '',
          codigoArrendador: r.codigo_arrendador || '',
          codigoEstablecimiento: r.codigo_establecimiento || '',
          baseUrl: r.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          aplicacion: 'Delfin_Check_in',
          simulacion: false,
          activo: true,
        };
        const passwordLen = typeof cfg.contraseña === 'string' ? cfg.contraseña.trim().length : 0;
        const hasRequiredVars = !!(cfg.usuario && passwordLen > 0 && cfg.codigoArrendador);
        const status = {
          configurado: hasRequiredVars,
          credenciales: {
            usuario: !!cfg.usuario,
            contraseña: passwordLen > 0,
            codigoArrendador: !!cfg.codigoArrendador,
          },
          configuracion: {
            baseUrl: cfg.baseUrl,
            aplicacion: cfg.aplicacion,
            simulacion: cfg.simulacion,
            activo: cfg.activo,
          },
        };
        return NextResponse.json({
          success: true,
          message: hasRequiredVars ? 'Configuración MIR completa' : 'Configuración MIR incompleta - faltan credenciales',
          config: {
            usuario: cfg.usuario,
            contraseña: '',
            codigoArrendador: cfg.codigoArrendador,
            codigoEstablecimiento: cfg.codigoEstablecimiento,
            baseUrl: cfg.baseUrl,
            aplicacion: cfg.aplicacion,
            simulacion: cfg.simulacion,
            activo: cfg.activo,
          },
          status,
          source: 'db',
          interpretacion: {
            configurado: hasRequiredVars,
            mensaje: hasRequiredVars
              ? '✅ Configuración MIR completa y lista para usar'
              : '❌ Configuración MIR incompleta - añade las credenciales en Configuración → MIR',
            credencialesFaltantes: [
              !cfg.usuario && 'Usuario MIR (Servicio Web)',
              !(passwordLen > 0) && 'Contraseña MIR (Servicio Web)',
              !cfg.codigoArrendador && 'Código Arrendador MIR',
            ].filter(Boolean),
          },
        });
      }
    } catch (multiErr) {
      console.warn('⚠️ No se pudo leer mir_credenciales, usando legacy:', multiErr);
    }

    // En SaaS multi-tenant: solo BD por tenant (sin fallback a variables de entorno).
    let config = {
      usuario: '',
      contraseña: '',
      codigoArrendador: '',
      codigoEstablecimiento: '',
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      aplicacion: 'Delfin_Check_in',
      simulacion: false,
      activo: false
    };
    let source: 'db' | 'none' = 'none';

    try {
      const result = await sql`
        SELECT usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, aplicacion, simulacion, activo
        FROM mir_configuraciones 
        WHERE propietario_id = ${tenantId} OR tenant_id = ${tenantId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      if (result.rows.length > 0) {
        const dbConfig = result.rows[0];
        config = {
          usuario: dbConfig.usuario || '',
          contraseña: dbConfig.contraseña || '',
          codigoArrendador: dbConfig.codigo_arrendador || '',
          codigoEstablecimiento: dbConfig.codigo_establecimiento || '',
          baseUrl: dbConfig.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          aplicacion: dbConfig.aplicacion || 'Delfin_Check_in',
          simulacion: dbConfig.simulacion || false,
          activo: dbConfig.activo || false
        };
        source = 'db';
        console.log('📋 Configuración cargada desde base de datos');
      } else {
        console.log('📋 No hay configuración MIR en base de datos para este tenant');
      }
    } catch (dbError) {
      console.error('❌ Error cargando configuración MIR desde base de datos:', dbError);
    }

    // Verificar si las credenciales están configuradas
    const passwordLen = typeof config.contraseña === 'string' ? config.contraseña.trim().length : 0;
    const hasRequiredVars = !!(config.usuario && passwordLen > 0 && config.codigoArrendador);

    const status = {
      configurado: hasRequiredVars,
      credenciales: {
        usuario: !!config.usuario,
        contraseña: passwordLen > 0,
        codigoArrendador: !!config.codigoArrendador
      },
      configuracion: {
        baseUrl: config.baseUrl,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion,
        activo: config.activo
      }
    };

    console.log('📋 Estado de configuración MIR:', status);

    return NextResponse.json({
      success: true,
      message: hasRequiredVars ? 
        'Configuración MIR completa' : 
        'Configuración MIR incompleta - faltan credenciales',
      // Seguridad: NO devolver contraseña en claro.
      // Podemos devolver el usuario WS para que el propietario lo vea sin tener que recordar el texto exacto.
      config: {
        usuario: config.usuario,
        contraseña: '',
        codigoArrendador: config.codigoArrendador,
        codigoEstablecimiento: config.codigoEstablecimiento,
        baseUrl: config.baseUrl,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion,
        activo: config.activo
      },
      status,
      source,
      interpretacion: {
        configurado: hasRequiredVars,
        mensaje: hasRequiredVars ? 
          '✅ Configuración MIR completa y lista para usar' : 
          '❌ Configuración MIR incompleta - añade las credenciales en Configuración → MIR',
        credencialesFaltantes: [
          !config.usuario && 'Usuario MIR (Servicio Web)',
          !config.contraseña && 'Contraseña MIR (Servicio Web)',
          !config.codigoArrendador && 'Código Arrendador MIR'
        ].filter(Boolean)
      }
    });

  } catch (error) {
    console.error('❌ Error verificando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error verificando configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}