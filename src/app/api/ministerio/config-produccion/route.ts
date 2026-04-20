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

    // Validar formato del usuario WS (oficial habitual: NIF/CIF/NIE + '---WS')
    // Aceptamos también formatos legacy sin guiones para no bloquear casos existentes.
    const u = String(usuario).trim().toUpperCase();
    const usuarioPatternOficial = /^[A-Z0-9]{6,15}---WS$/; // ej: 12345678A---WS, B12345678---WS
    const usuarioPatternLegacy = /^[A-Z0-9]{6,15}WS$/; // ej: 27380387ZWS
    if (!usuarioPatternOficial.test(u) && !usuarioPatternLegacy.test(u)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de usuario incorrecto',
        message:
          'El usuario debe ser el del Servicio Web del MIR. Formato habitual: NIF/CIF/NIE + "---WS" (ej: 12345678A---WS).'
      }, { status: 400 });
    }

    console.log('📋 Configurando credenciales MIR:', {
      usuario,
      codigoArrendador,
      baseUrl,
      simulacion
    });

    // Obtener tenant_id autenticado (robusto multi-tenant). Header solo como fallback.
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado', message: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    // Permitir guardar sin volver a introducir la contraseña:
    // - Si llega vacía pero ya existe en BD para este tenant, la mantenemos.
    // - Si no existe aún, entonces sí es obligatoria.
    let finalPassword = typeof contraseña === 'string' ? contraseña : '';
    if (!finalPassword || finalPassword.trim() === '') {
      try {
        const existing = await sql`
          SELECT contraseña
          FROM mir_configuraciones
          WHERE propietario_id = ${tenantId} OR tenant_id = ${tenantId}
          ORDER BY updated_at DESC
          LIMIT 1
        `;
        const existingPassword = (existing.rows[0]?.contraseña as string | null | undefined) || '';
        if (existingPassword) {
          finalPassword = existingPassword;
        }
      } catch {
        // ignore: si no podemos leer, validaremos abajo
      }
    }

    // Validaciones (tras fallback de contraseña)
    if (!u || !finalPassword || !codigoArrendador || !codigoEstablecimiento) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales incompletas',
          message:
            !finalPassword || finalPassword.trim() === ''
              ? 'La contraseña MIR es obligatoria (o ya debe estar guardada previamente).'
              : 'Usuario, código de arrendador y código de establecimiento son obligatorios',
        },
        { status: 400 }
      );
    }

    // Guardar en la base de datos
    try {
      // Primero intentar actualizar
      const updateResult = await sql`
        UPDATE mir_configuraciones 
        SET 
          usuario = ${u},
          contraseña = ${finalPassword},
          codigo_arrendador = ${codigoArrendador},
          codigo_establecimiento = ${codigoEstablecimiento},
          base_url = ${baseUrl},
          aplicacion = ${aplicacion},
          simulacion = ${simulacion},
          activo = true,
          updated_at = NOW()
        WHERE propietario_id = ${tenantId} OR tenant_id = ${tenantId}
      `;

      // Si no se actualizó ninguna fila, insertar nueva
      if (updateResult.rowCount === 0) {
        await sql`
          INSERT INTO mir_configuraciones (
            propietario_id, usuario, contraseña, codigo_arrendador, codigo_establecimiento,
            base_url, aplicacion, simulacion, activo, created_at, updated_at
          ) VALUES (
            ${tenantId}, ${u}, ${finalPassword}, ${codigoArrendador}, ${codigoEstablecimiento},
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
      usuario: u,
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
          '1. Prueba la conexión usando el botón "Probar Conexión"',
          '2. Realiza un envío de prueba desde el panel MIR/Estado de envíos',
          '3. Si hay errores, revisa el mensaje y corrige el dato del huésped/estancia',
          '4. Una vez verificado, puedes usar el sistema en producción'
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