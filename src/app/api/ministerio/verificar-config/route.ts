import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando configuración MIR...');

    // Obtener tenant_id del header
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // Intentar cargar desde la base de datos primero
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

    try {
      const result = await sql`
        SELECT usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, aplicacion, simulacion, activo
        FROM mir_configuraciones 
        WHERE propietario_id = ${tenantId}
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
        console.log('📋 Configuración cargada desde base de datos');
      } else {
        console.log('📋 No hay configuración en base de datos, usando variables de entorno');
        // Fallback a variables de entorno si no hay configuración en BD
        config = {
          usuario: process.env.MIR_HTTP_USER || '',
          contraseña: process.env.MIR_HTTP_PASS || '',
          codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
          codigoEstablecimiento: process.env.MIR_CODIGO_ESTABLECIMIENTO || '',
          baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
          simulacion: process.env.MIR_SIMULACION === 'true',
          activo: true
        };
      }
    } catch (dbError) {
      console.error('❌ Error cargando desde base de datos, usando variables de entorno:', dbError);
      // Fallback a variables de entorno
      config = {
        usuario: process.env.MIR_HTTP_USER || '',
        contraseña: process.env.MIR_HTTP_PASS || '',
        codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
        codigoEstablecimiento: process.env.MIR_CODIGO_ESTABLECIMIENTO || '',
        baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
        aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
        simulacion: process.env.MIR_SIMULACION === 'true',
        activo: true
      };
    }

    // Verificar si las credenciales están configuradas
    const hasRequiredVars = !!(
      config.usuario &&
      config.contraseña &&
      config.codigoArrendador
    );

    const status = {
      configurado: hasRequiredVars,
      credenciales: {
        usuario: !!config.usuario,
        contraseña: !!config.contraseña,
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
      config: {
        usuario: config.usuario,
        contraseña: config.contraseña, // Devolver la contraseña real para el formulario
        codigoArrendador: config.codigoArrendador,
        codigoEstablecimiento: config.codigoEstablecimiento,
        baseUrl: config.baseUrl,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion,
        activo: config.activo
      },
      status,
      interpretacion: {
        configurado: hasRequiredVars,
        mensaje: hasRequiredVars ? 
          '✅ Configuración MIR completa y lista para usar' : 
          '❌ Configuración MIR incompleta - configura las credenciales en las variables de entorno',
        credencialesFaltantes: [
          !config.usuario && 'Usuario MIR (MIR_HTTP_USER)',
          !config.contraseña && 'Contraseña MIR (MIR_HTTP_PASS)',
          !config.codigoArrendador && 'Código Arrendador (MIR_CODIGO_ARRENDADOR)'
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