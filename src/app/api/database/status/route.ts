import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function maskConnectionString(conn?: string): string {
  if (!conn) return 'not-set';
  try {
    const url = new URL(conn.replace('postgresql://', 'http://'));
    const host = url.host;
    const db = url.pathname.replace('/', '') || 'db';
    // Enmascarar usuario y host parcialmente
    const maskedHost = host.replace(/^(..).*?(..)$/u, '$1***$2');
    return `postgres://${maskedHost}/${db}`;
  } catch {
    return 'invalid-connection-string';
  }
}

export async function GET(request: NextRequest) {
  try {
    // ⚠️ SEGURIDAD: Verificar autenticación y obtener tenant_id
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = payload.tenantId;

    // ⚠️ CRÍTICO: Filtrar TODOS los conteos por tenant_id para aislamiento multi-tenant
    const [rooms, reservations, guests, guestRegs, msgTemplates] = await Promise.all([
      sql`SELECT COUNT(1) AS c FROM "Room" WHERE tenant_id = ${tenantId}::uuid` .catch(() => ({ rows: [{ c: 0 }] } as any)),
      sql`SELECT COUNT(1) AS c FROM reservations WHERE tenant_id = ${tenantId}::uuid` .catch(() => ({ rows: [{ c: 0 }] } as any)),
      sql`SELECT COUNT(1) AS c FROM guests WHERE tenant_id = ${tenantId}::uuid` .catch(() => ({ rows: [{ c: 0 }] } as any)),
      sql`SELECT COUNT(1) AS c FROM guest_registrations WHERE tenant_id = ${tenantId}::uuid` .catch(() => ({ rows: [{ c: 0 }] } as any)),
      sql`SELECT COUNT(1) AS c FROM message_templates WHERE tenant_id = ${tenantId}::uuid` .catch(() => ({ rows: [{ c: 0 }] } as any)),
    ]);

    const info = {
      connectedTo: maskConnectionString(process.env.POSTGRES_URL),
      tenant_id: tenantId,
      counts: {
        rooms: Number(rooms.rows?.[0]?.c || 0),
        reservations: Number(reservations.rows?.[0]?.c || 0),
        guests: Number(guests.rows?.[0]?.c || 0),
        guest_registrations: Number(guestRegs.rows?.[0]?.c || 0),
        message_templates: Number(msgTemplates.rows?.[0]?.c || 0),
      },
    };

    return NextResponse.json(info);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'database-status-failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}


