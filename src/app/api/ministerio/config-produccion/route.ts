import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('⚙️ Configurando credenciales MIR...');
    
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

    const {
      usuario,
      contraseña,
      codigoArrendador,
      codigoEstablecimiento,
      baseUrl = 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      aplicacion = 'Delfin_Check_in',
      simulacion = false
    } = json;

    // Validaciones
    if (!usuario || !contraseña || !codigoArrendador || !codigoEstablecimiento) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales incompletas',
        message: 'Usuario, contraseña, código de arrendador y código de establecimiento son obligatorios'
      }, { status: 400 });
    }

    // Validar formato del usuario (DNI/CIF + letra + WS)
    const usuarioPattern = /^[0-9]+[A-Z]WS$/;
    if (!usuarioPattern.test(usuario)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de usuario incorrecto',
        message: 'El usuario debe seguir el formato: DNI/CIF + letra + WS (ejemplo: 27380387ZWS, 12345678TWS)'
      }, { status: 400 });
    }

    console.log('📋 Configurando credenciales MIR:', {
      usuario,
      codigoArrendador,
      baseUrl,
      simulacion
    });

    // Obtener tenant_id del header
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // Guardar en la base de datos
    try {
      // Primero intentar actualizar
      const updateResult = await sql`
        UPDATE mir_configuraciones 
        SET 
          usuario = ${usuario},
          contraseña = ${contraseña},
          codigo_arrendador = ${codigoArrendador},
          codigo_establecimiento = ${codigoEstablecimiento},
          base_url = ${baseUrl},
          aplicacion = ${aplicacion},
          simulacion = ${simulacion},
          activo = true,
          updated_at = NOW()
        WHERE propietario_id = ${tenantId}
      `;

      // Si no se actualizó ninguna fila, insertar nueva
      if (updateResult.rowCount === 0) {
        await sql`
          INSERT INTO mir_configuraciones (
            propietario_id, usuario, contraseña, codigo_arrendador, codigo_establecimiento,
            base_url, aplicacion, simulacion, activo, created_at, updated_at
          ) VALUES (
            ${tenantId}, ${usuario}, ${contraseña}, ${codigoArrendador}, ${codigoEstablecimiento},
            ${baseUrl}, ${aplicacion}, ${simulacion}, true, NOW(), NOW()
          )
        `;
      }

      console.log('✅ Configuración MIR guardada en base de datos correctamente');
    } catch (dbError) {
      console.error('❌ Error guardando en base de datos:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Error guardando configuración',
        message: 'No se pudo guardar la configuración en la base de datos'
      }, { status: 500 });
    }

    // Intentar reenviar comunicaciones pendientes por falta de credenciales (best-effort)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || req.nextUrl.origin;
      const retryRes = await fetch(`${baseUrl}/api/ministerio/reintentar-pendientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({ limit: 25 })
      });
      const retryJson = await retryRes.json().catch(() => null);
      console.log('🔁 Reintento de pendientes tras guardar credenciales:', {
        ok: retryRes.ok,
        status: retryRes.status,
        retry: retryJson
      });
    } catch (retryError) {
      console.warn('⚠️ No se pudo reintentar pendientes MIR tras guardar credenciales:', retryError);
    }
    
    const configuracion = {
      usuario,
      contraseña: '***', // No devolver la contraseña real
      codigoArrendador,
      codigoEstablecimiento,
      baseUrl,
      aplicacion,
      simulacion,
      activo: true
    };

    console.log('✅ Configuración MIR validada y guardada correctamente');

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR guardada correctamente',
      configuracion,
      interpretacion: {
        exito: true,
        mensaje: '✅ Configuración MIR guardada correctamente. Las credenciales han sido validadas.',
        detalles: {
          usuario: configuracion.usuario,
          codigoArrendador: configuracion.codigoArrendador,
          baseUrl: configuracion.baseUrl,
          simulacion: configuracion.simulacion,
          activo: configuracion.activo
        }
      },
      instrucciones: {
        titulo: 'Próximos pasos',
        pasos: [
          '1. Verifica que las credenciales estén configuradas en las variables de entorno de Vercel',
          '2. Prueba la conexión usando el botón "Probar Conexión"',
          '3. Accede al panel MIR para enviar comunicaciones de prueba',
          '4. Una vez verificado, puedes usar el sistema en producción'
        ]
      },
      variablesEntorno: {
        titulo: 'Variables de entorno requeridas en Vercel',
        variables: [
          `MIR_HTTP_USER=${usuario}`,
          `MIR_HTTP_PASS=${contraseña}`,
          `MIR_CODIGO_ARRENDADOR=${codigoArrendador}`,
          `MIR_BASE_URL=${baseUrl}`,
          `MIR_APLICACION=${aplicacion}`,
          `MIR_SIMULACION=${simulacion}`
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error configurando credenciales MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error configurando credenciales MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}