import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { normalizeComunicacion } from '@/lib/ministerio-normalizer';

export async function POST(req: NextRequest) {
  try {
    const { limit = 50 } = await req.json().catch(() => ({}));

    const result = await sql`
      SELECT id, data FROM guest_registrations 
      WHERE data->>'mir_status' IS NULL OR (data->'mir_status'->>'estado' = 'error')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const updates: any[] = [];

    for (const row of result.rows) {
      const normalized = normalizeComunicacion(row.data);
      const newData = { ...row.data, ...normalized };
      await sql`UPDATE guest_registrations SET data = ${newData} WHERE id = ${row.id}`;
      updates.push(row.id);
    }

    return NextResponse.json({ success: true, updated: updates.length, ids: updates });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}


