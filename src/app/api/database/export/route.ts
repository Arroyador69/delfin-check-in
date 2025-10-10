import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Leer tablas principales
    const [rooms, reservations, guests, guestRegs, msgTemplates] = await Promise.all([
      sql`SELECT * FROM "Room"`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM reservations`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM guests`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM guest_registrations`.catch(() => ({ rows: [] } as any)),
      sql`SELECT * FROM message_templates`.catch(() => ({ rows: [] } as any)),
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      rooms: rooms.rows,
      reservations: reservations.rows,
      guests: guests.rows,
      guest_registrations: guestRegs.rows,
      message_templates: msgTemplates.rows,
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'database-export-failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}


