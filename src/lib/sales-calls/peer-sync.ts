/**
 * Sync de huecos ocupados con el otro proyecto (NFCTap).
 * El cliente NUNCA ve que hay sync; solo ve huecos libres.
 *
 * Env:
 * - SALES_CALL_PEER_URL = https://nfctap.tech (sin slash final)
 * - SALES_CALL_SYNC_SECRET = secreto compartido
 */

export type BusyInterval = { startAt: string; endAt: string };

function peerBase(): string {
  return String(process.env.SALES_CALL_PEER_URL || '')
    .trim()
    .replace(/\/+$/, '');
}

function syncSecret(): string {
  return String(process.env.SALES_CALL_SYNC_SECRET || '').trim();
}

export async function fetchPeerBusy(
  fromIso: string,
  toIso: string
): Promise<BusyInterval[]> {
  const base = peerBase();
  const secret = syncSecret();
  if (!base || !secret) return [];

  try {
    const url = new URL(`${base}/api/public/sales-calls/peer-busy`);
    url.searchParams.set('from', fromIso);
    url.searchParams.set('to', toIso);
    const res = await fetch(url.toString(), {
      headers: { 'X-Sales-Call-Sync': secret },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { busy?: BusyInterval[] };
    return Array.isArray(j.busy) ? j.busy : [];
  } catch {
    return [];
  }
}

/** Avisa al peer para bloquear el hueco allí (espejo). */
export async function mirrorBookingToPeer(opts: {
  startAt: string;
  endAt: string;
  bookingId: string;
  name: string;
  email: string;
}): Promise<{ ok: boolean; peerId?: string }> {
  const base = peerBase();
  const secret = syncSecret();
  if (!base || !secret) return { ok: true };

  try {
    const res = await fetch(`${base}/api/public/sales-calls/peer-busy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sales-Call-Sync': secret,
      },
      body: JSON.stringify({
        startAt: opts.startAt,
        endAt: opts.endAt,
        remoteId: opts.bookingId,
        name: opts.name,
        email: opts.email,
        project: 'delfin',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false };
    const j = (await res.json()) as { id?: string };
    return { ok: true, peerId: j.id };
  } catch {
    return { ok: false };
  }
}

export function authorizeSalesCallSync(req: Request): boolean {
  const secret = syncSecret();
  if (!secret) return false;
  const header = req.headers.get('X-Sales-Call-Sync') || '';
  return header === secret;
}
