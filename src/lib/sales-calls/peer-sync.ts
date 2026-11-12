/**
 * Sync de huecos ocupados con el otro proyecto (NFCTap).
 * El cliente NUNCA ve que hay sync; solo ve huecos libres.
 *
 * Env:
 * - SALES_CALL_PEER_URL = https://nfctap.tech (sin slash final)
 * - SALES_CALL_SYNC_SECRET = secreto compartido
 *
 * NFCTap hoy:
 * - Público: GET /api/calls/slots?days=N  → huecos LIBRES
 * - Ideal: GET/POST/DELETE /api/public/sales-calls/peer-busy (contrato)
 * Mientras el peer-busy no exista, inferimos ocupados = rejilla esperada − slots libres.
 */

import {
  SALES_CALL_BUFFER_MIN,
  SALES_CALL_DURATION_MIN,
  SALES_CALL_SLOT_STEP_MIN,
} from './constants';
import {
  generateSlotStarts,
  madridDateKey,
  slotEnd,
} from './slots';

export type BusyInterval = { startAt: string; endAt: string };

function peerBase(): string {
  return String(process.env.SALES_CALL_PEER_URL || '')
    .trim()
    .replace(/\/+$/, '');
}

function syncSecret(): string {
  return String(process.env.SALES_CALL_SYNC_SECRET || '').trim();
}

function peerBusyPaths(): string[] {
  const custom = String(process.env.SALES_CALL_PEER_BUSY_PATH || '').trim();
  const paths = [
    custom,
    '/api/public/sales-calls/peer-busy',
    '/api/calls/peer-busy',
  ].filter(Boolean);
  return [...new Set(paths)];
}

export async function fetchPeerBusy(
  fromIso: string,
  toIso: string
): Promise<BusyInterval[]> {
  const base = peerBase();
  if (!base) return [];

  const secret = syncSecret();
  if (secret) {
    for (const path of peerBusyPaths()) {
      try {
        const url = new URL(`${base}${path}`);
        url.searchParams.set('from', fromIso);
        url.searchParams.set('to', toIso);
        const res = await fetch(url.toString(), {
          headers: { 'X-Sales-Call-Sync': secret },
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (!res.ok) continue;
        const j = (await res.json()) as { busy?: BusyInterval[] };
        if (Array.isArray(j.busy)) return j.busy;
      } catch {
        /* try next */
      }
    }
  }

  // Fallback: inferir desde slots libres públicos de NFCTap
  return inferBusyFromPeerSlots(fromIso, toIso);
}

async function inferBusyFromPeerSlots(
  fromIso: string,
  toIso: string
): Promise<BusyInterval[]> {
  const base = peerBase();
  if (!base) return [];

  try {
    const fromMs = new Date(fromIso).getTime();
    const toMs = new Date(toIso).getTime();
    const spanDays = Math.min(
      60,
      Math.max(10, Math.ceil((toMs - fromMs) / (24 * 3600_000)) + 2)
    );
    const url = `${base}/api/calls/slots?days=${spanDays}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      ok?: boolean;
      slots?: Array<{ startsAt?: string; endsAt?: string }>;
      byDate?: Record<string, Array<{ startsAt?: string; endsAt?: string }>>;
    };
    if (!j || j.ok === false) return [];

    const free = new Set<string>();
    const pushFree = (startsAt?: string) => {
      if (!startsAt) return;
      const t = new Date(startsAt).getTime();
      if (Number.isFinite(t)) free.add(new Date(t).toISOString());
    };
    for (const s of j.slots || []) pushFree(s.startsAt);
    for (const list of Object.values(j.byDate || {})) {
      for (const s of list || []) pushFree(s.startsAt);
    }

    // Misma rejilla que nosotros (45 min) → lo que no está libre = ocupado
    const fromKey = madridDateKey(new Date(fromIso));
    const expected = generateSlotStarts({
      fromDateKey: fromKey,
      days: spanDays,
      now: new Date(0), // incluir todos los del rango (lead time lo filtra Delfín aparte)
    });

    const busy: BusyInterval[] = [];
    for (const start of expected) {
      const iso = start.toISOString();
      if (start.getTime() < fromMs || start.getTime() > toMs) continue;
      if (free.has(iso)) continue;
      busy.push({
        startAt: iso,
        endAt: slotEnd(start).toISOString(),
      });
    }
    return busy;
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

  const body = JSON.stringify({
    startAt: opts.startAt,
    endAt: opts.endAt,
    remoteId: opts.bookingId,
    name: opts.name,
    email: opts.email,
    project: 'delfin',
    durationMinutes: SALES_CALL_DURATION_MIN,
    bufferMinutes: SALES_CALL_BUFFER_MIN,
  });

  for (const path of peerBusyPaths()) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sales-Call-Sync': secret,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as { id?: string };
      return { ok: true, peerId: j.id };
    } catch {
      /* try next */
    }
  }
  return { ok: false };
}

/** Libera el espejo en el peer (cancelación). */
export async function mirrorCancelToPeer(opts: {
  remoteId: string;
  startAt?: string;
}): Promise<boolean> {
  const base = peerBase();
  const secret = syncSecret();
  if (!base || !secret) return true;

  const body = JSON.stringify({
    remoteId: opts.remoteId,
    startAt: opts.startAt,
    action: 'cancel',
  });

  for (const path of peerBusyPaths()) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sales-Call-Sync': secret,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

export function authorizeSalesCallSync(req: Request): boolean {
  const secret = syncSecret();
  if (!secret) return false;
  const header = req.headers.get('X-Sales-Call-Sync') || '';
  return header === secret;
}

/**
 * ¿El hueco local choca con un busy del peer?
 * Usa solape de llamada + margen (buffer) para rejillas distintas.
 */
export function slotConflictsWithBusy(
  slotStart: Date,
  busy: BusyInterval
): boolean {
  const slotStartMs = slotStart.getTime();
  const slotEndMs = slotEnd(slotStart).getTime();
  const busyStartMs = new Date(busy.startAt).getTime();
  let busyEndMs = new Date(busy.endAt).getTime();
  if (!Number.isFinite(busyStartMs)) return false;
  if (!Number.isFinite(busyEndMs) || busyEndMs <= busyStartMs) {
    busyEndMs = busyStartMs + SALES_CALL_DURATION_MIN * 60_000;
  }
  // Ocupación “comercial”: llamada + margen hasta el siguiente inicio posible
  const occupyEndMs = Math.max(
    busyEndMs + SALES_CALL_BUFFER_MIN * 60_000,
    busyStartMs + SALES_CALL_SLOT_STEP_MIN * 60_000
  );
  return slotStartMs < occupyEndMs && slotEndMs > busyStartMs;
}
