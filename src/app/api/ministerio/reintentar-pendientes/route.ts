import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logError } from '@/lib/error-logger';

function getBaseUrl(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (env) return env;
  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const { validateLegalModuleAccess } = await import('@/lib/permissions');
    const legalValidation = await validateLegalModuleAccess(req);
    if (!legalValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: legalValidation.error,
          code: 'LEGAL_MODULE_REQUIRED'
        },
        { status: legalValidation.status || 403 }
      );
    }

    const tenantId =
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      req.nextUrl.searchParams.get('tenant_id') ||
      null;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenant_id requerido' },
        { status: 400 }
      );
    }

    const { limit = 25 } = (await req.json().catch(() => ({}))) as { limit?: number };

    const pendientes = await sql`
      SELECT id, reserva_ref, fecha_entrada, fecha_salida, data
      FROM guest_registrations
      WHERE tenant_id = ${tenantId}::uuid
        AND (
          (data->'mir_status'->>'estado' = 'pendiente' AND data->'mir_status'->>'reason' = 'credenciales_no_configuradas')
          OR (data->'mir_status'->>'estado' = 'error' AND (data->'mir_status'->>'error') ILIKE '%Credenciales MIR no configuradas%')
        )
      ORDER BY created_at ASC
      LIMIT ${Math.max(1, Math.min(Number(limit) || 25, 100))}
    `;

    const baseUrl = getBaseUrl(req);
    const enviados: any[] = [];
    const fallidos: any[] = [];

    for (const row of pendientes.rows) {
      const reservaRef = row.reserva_ref;
      try {
        const comunicacion = row.data?.comunicaciones?.[0];
        const personas = comunicacion?.personas || [];

        const datosMIR = {
          referencia: reservaRef,
          fechaEntrada: row.fecha_entrada,
          fechaSalida: row.fecha_salida,
          tipoPago: comunicacion?.contrato?.pago?.tipoPago || 'EFECT',
          pago: {
            tipoPago: comunicacion?.contrato?.pago?.tipoPago || 'EFECT',
            fechaPago: comunicacion?.contrato?.pago?.fechaPago,
            medioPago: comunicacion?.contrato?.pago?.medioPago,
            titular: comunicacion?.contrato?.pago?.titular,
            caducidadTarjeta: comunicacion?.contrato?.pago?.caducidadTarjeta
          },
          personas: personas.map((p: any) => ({
            nombre: p.nombre,
            apellido1: p.apellido1,
            apellido2: p.apellido2 || '',
            tipoDocumento: p.tipoDocumento || 'NIF',
            numeroDocumento: p.numeroDocumento || '',
            soporteDocumento: p.soporteDocumento,
            fechaNacimiento: p.fechaNacimiento,
            nacionalidad: p.nacionalidad || 'ESP',
            sexo: p.sexo || 'M',
            contacto: {
              telefono: p.contacto?.telefono || '',
              correo: p.contacto?.correo || ''
            },
            direccion: {
              direccion: p.direccion?.direccion,
              codigoPostal: p.direccion?.codigoPostal,
              pais: p.direccion?.pais,
              codigoMunicipio: p.direccion?.codigoMunicipio,
              nombreMunicipio: p.direccion?.nombreMunicipio
            }
          })),
          tenant_id: tenantId
        };

        const res = await fetch(`${baseUrl}/api/ministerio/auto-envio-dual`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId
          },
          body: JSON.stringify(datosMIR)
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.success) {
          fallidos.push({ reserva_ref: reservaRef, status: res.status, body });
          continue;
        }

        // Marcar como enviado en guest_registrations para que el dashboard lo refleje aunque el MIR tarde en confirmar
        const updatedData = {
          ...(row.data || {}),
          mir_status: {
            lote: body?.resultados?.pv?.lote || body?.resultados?.rh?.lote || null,
            codigoComunicacion: body?.resultados?.pv?.codigoComunicacion || body?.resultados?.rh?.codigoComunicacion || null,
            fechaEnvio: new Date().toISOString(),
            estado: body?.estado || 'enviado',
            reason: null,
            comunicaciones: body?.comunicaciones || [],
            resultados: body?.resultados || {}
          }
        };

        await sql`
          UPDATE guest_registrations
          SET 
            data = ${JSON.stringify(updatedData)}::jsonb,
            comunicacion_id = ${reservaRef}
          WHERE id = ${row.id}
        `;

        enviados.push({ reserva_ref: reservaRef });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        fallidos.push({ reserva_ref: row.reserva_ref, error: msg });
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendientes.rows.length,
      sent: enviados.length,
      failed: fallidos.length,
      enviados,
      fallidos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logError({
      level: 'error',
      message: `Error reintentando comunicaciones pendientes MIR: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      error,
      tenantId: req.headers.get('x-tenant-id') || null,
      url: '/api/ministerio/reintentar-pendientes'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

