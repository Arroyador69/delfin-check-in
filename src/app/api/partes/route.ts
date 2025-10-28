import { NextRequest, NextResponse } from 'next/server';
import { parteSchema } from '@/lib/rd933';
import { sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import crypto from 'crypto';

// Memoria temporal (MVP) para idempotencia por hash
const processed = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const body = await request.json();

    // Validación RD 933
    const parsed = parteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validación RD933 fallida', details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    // Hash del payload para idempotencia y auditoría básica
    const hash = crypto.createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
    await logAudit({
      action: 'PARTE_CREATE',
      entityType: 'parte',
      entityId: hash,
      payloadHash: hash,
      ip: request.headers.get('x-forwarded-for') || null,
      meta: { source: 'form-publico' }
    });
    if (processed.has(hash)) {
      return NextResponse.json({ success: true, queued: false, duplicate: true, hash }, { status: 200, headers: corsHeaders });
    }

    // Persistir en guest_registrations para que aparezca en el dashboard
    const entrada = parsed.data.ejecucionContrato.fechaHoraEntrada;
    const salida = parsed.data.ejecucionContrato.fechaHoraSalida;

    // Normalizar estructura mínima compatible con exportador actual
    const registro = {
      contrato: {
        codigoEstablecimiento: parsed.data.establecimiento.codigoEstablecimiento || '0000256653',
        referencia: 'FORM-' + new Date().toISOString().slice(0,10),
        numHabitaciones: 1,
        internet: false,
        tipoPago: parsed.data.pago.tipo,
      },
      comunicaciones: [
        {
          contrato: {
            referencia: 'FORM-' + new Date().toISOString(),
            fechaContrato: new Date(entrada).toISOString(),
            fechaEntrada: new Date(entrada).toISOString(),
            fechaSalida: new Date(salida).toISOString(),
            numPersonas: parsed.data.viajeros.length
          },
          personas: parsed.data.viajeros.map(v => ({
            nombre: v.nombre,
            apellido1: v.primerApellido,
            apellido2: v.segundoApellido || '',
            tipoDocumento: v.documento.tipo,
            numeroDocumento: v.documento.numero,
            nacionalidad: v.nacionalidad,
          }))
        }
      ],
      audit_hash: hash
    };

    await sql`
      INSERT INTO guest_registrations (reserva_ref, fecha_entrada, fecha_salida, data)
      VALUES (${registro.contrato.referencia}, ${entrada}::timestamp, ${salida}::timestamp, ${JSON.stringify(registro)}::jsonb)
    `;

    await logAudit({
      action: 'VALIDATE_OK',
      entityType: 'parte',
      entityId: hash,
      payloadHash: hash,
      ip: request.headers.get('x-forwarded-for') || null,
      meta: { saved: true }
    });

    processed.add(hash);

    return NextResponse.json({ success: true, queued: false, hash }, { status: 201, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
