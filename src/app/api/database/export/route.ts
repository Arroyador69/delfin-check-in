import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // ⚠️ CRÍTICO: Filtrar TODOS los datos por tenant_id para aislamiento multi-tenant
    const [rooms, reservations, guests, guestRegs, msgTemplates] = await Promise.all([
      sql`SELECT * FROM "Room" WHERE tenant_id = ${tenantId}::uuid`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM reservations WHERE tenant_id = ${tenantId}::uuid`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM guests WHERE tenant_id = ${tenantId}::uuid`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM guest_registrations WHERE tenant_id = ${tenantId}::uuid`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM message_templates WHERE tenant_id = ${tenantId}::uuid`.catch(() => ({ rows: [] } as any)),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      tenant_id: tenantId,
      rooms: rooms.rows,
      reservations: reservations.rows,
      guests: guests.rows,
      guest_registrations: guestRegs.rows,
      message_templates: msgTemplates.rows,
    };

    return NextResponse.json(exportData);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'database-export-failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}


