import { NextRequest, NextResponse } from 'next/server';
import { listLocalBusy, upsertPeerMirror } from '@/lib/sales-calls/bookings';
import { authorizeSalesCallSync } from '@/lib/sales-calls/peer-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: huecos ocupados locales (para que el peer no ofrezca el mismo slot). */
export async function GET(req: NextRequest) {
  if (!authorizeSalesCallSync(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const from = req.nextUrl.searchParams.get('from') || '';
  const to = req.nextUrl.searchParams.get('to') || '';
  if (!from || !to) {
    return NextResponse.json({ error: 'from/to required' }, { status: 400 });
  }
  const busy = await listLocalBusy(from, to);
  return NextResponse.json({ busy });
}

/** POST: espejo de reserva del peer → bloquea hueco aquí. */
export async function POST(req: NextRequest) {
  if (!authorizeSalesCallSync(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const startAt = String(body.startAt || '');
  const endAt = String(body.endAt || '');
  const remoteId = String(body.remoteId || body.id || '');
  if (!startAt || !endAt || !remoteId) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  try {
    const row = await upsertPeerMirror({
      startAt,
      endAt,
      remoteId,
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email) : undefined,
      project: body.project ? String(body.project) : undefined,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error('[sales-calls/peer-busy POST]', e);
    return NextResponse.json({ error: 'mirror_failed' }, { status: 500 });
  }
}
