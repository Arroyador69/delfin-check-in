import { NextRequest, NextResponse } from 'next/server';
import { parteSchema } from '@/lib/rd933';
import crypto from 'crypto';

// Memoria temporal (MVP) para idempotencia por hash
const processed = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validación RD 933
    const parsed = parteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validación RD933 fallida', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Hash del payload para idempotencia y auditoría básica
    const hash = crypto.createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
    if (processed.has(hash)) {
      return NextResponse.json({ success: true, queued: false, duplicate: true, hash }, { status: 200 });
    }

    // MVP: no persistimos aún, solo marcamos como procesado
    processed.add(hash);

    return NextResponse.json({ success: true, queued: false, hash }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
