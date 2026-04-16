import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getTenantId } from '@/lib/tenant';

const CATEGORIES = [
  'software_issue',
  'integration_error',
  'data_export',
  'account_access',
  'other_technical',
] as const;

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function resolveAuthPayload(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      const p = verifyToken(bearer);
      if (p?.userId && p?.email) return p;
    }
  }
  const cookie = request.cookies.get('auth_token')?.value;
  if (!cookie) return null;
  const p = verifyToken(cookie);
  return p?.userId && p?.email ? p : null;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const result = await sql`
      SELECT id, subject, category, status, created_at, updated_at
      FROM support_tickets
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ success: true, tickets: result.rows });
  } catch (e) {
    console.error('support-tickets GET tenant:', e);
    return NextResponse.json({ success: true, tickets: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const payload = resolveAuthPayload(request);
    if (!payload?.userId || !payload?.email) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
    }

    if (payload.role !== 'owner' && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el propietario o administrador del establecimiento pueden abrir incidencias técnicas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const subject = String(body.subject ?? '').trim();
    const text = String(body.body ?? '').trim();
    const category = String(body.category ?? 'software_issue').trim();

    if (subject.length < 10 || subject.length > 200) {
      return badRequest('El asunto debe tener entre 10 y 200 caracteres.');
    }
    if (text.length < 50 || text.length > 8000) {
      return badRequest(
        'Describe el problema con detalle (mínimo 50 caracteres, máximo 8000). Incluye pasos para reproducirlo si aplica.'
      );
    }
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return badRequest('Categoría no válida.');
    }

    const insert = await sql`
      INSERT INTO support_tickets (
        tenant_id,
        created_by_user_id,
        reporter_email,
        subject,
        body,
        category
      )
      VALUES (
        ${tenantId},
        ${payload.userId}::uuid,
        ${payload.email},
        ${subject},
        ${text},
        ${category}
      )
      RETURNING id, created_at
    `;

    const row = insert.rows[0];
    return NextResponse.json({
      success: true,
      ticket: { id: row.id, created_at: row.created_at },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('support_tickets') || msg.includes('does not exist')) {
      return NextResponse.json(
        {
          error:
            'La tabla de incidencias no está creada en la base de datos. Ejecuta database/support-tickets.sql.',
        },
        { status: 503 }
      );
    }
    console.error('support-tickets POST tenant:', e);
    return NextResponse.json({ error: 'Error al registrar la incidencia' }, { status: 500 });
  }
}
