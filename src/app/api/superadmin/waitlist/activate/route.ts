import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { activateWaitlistEntryFromRow } from '@/lib/waitlist-activate-from-entry';

/**
 * ========================================
 * ENDPOINT: Activar Usuario de Waitlist
 * ========================================
 * Activa un usuario de la waitlist creando su tenant y enviando email de onboarding
 *
 * POST /api/superadmin/waitlist/activate
 * Body: { email: string } o { id: string }
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, id } = body;

    if (!email && !id) {
      return NextResponse.json({ success: false, error: 'Se requiere email o id' }, { status: 400 });
    }

    let waitlistEntry;
    if (id) {
      const result = await sql`
        SELECT id, email, name, created_at, activated_at, tenant_id
        FROM waitlist
        WHERE id = ${id}
        LIMIT 1
      `;

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No se encontró la entrada en la waitlist' },
          { status: 404 }
        );
      }

      waitlistEntry = result.rows[0];
    } else {
      const result = await sql`
        SELECT id, email, name, created_at, activated_at, tenant_id
        FROM waitlist
        WHERE email = ${email}
        LIMIT 1
      `;

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No se encontró el email en la waitlist' },
          { status: 404 }
        );
      }

      waitlistEntry = result.rows[0];
    }

    if (waitlistEntry.activated_at) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este usuario ya está activado',
          alreadyActivated: true,
          tenant_id: waitlistEntry.tenant_id,
        },
        { status: 400 }
      );
    }

    return activateWaitlistEntryFromRow(
      {
        id: waitlistEntry.id,
        email: waitlistEntry.email,
        name: waitlistEntry.name,
      },
      req,
      body
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error activando usuario de waitlist:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al activar usuario',
        details: msg,
      },
      { status: 500 }
    );
  }
}
