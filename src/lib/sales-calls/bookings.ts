import { sql } from '@/lib/db';
import {
  SALES_CALL_DURATION_MIN,
  SALES_CALL_PROJECT,
  salesCallMeetingUrl,
} from './constants';
import { fetchPeerBusy, mirrorBookingToPeer } from './peer-sync';
import { ensureSalesCallBookingsSchema } from './schema';
import {
  formatSlotMadrid,
  generateSlotStarts,
  madridDateKey,
  slotEnd,
} from './slots';
import { notifySalesCallBooked } from './telegram-notify';

export type AvailabilityDay = {
  dateKey: string;
  dateLabel: string;
  slots: Array<{ startAt: string; timeLabel: string; endAt: string }>;
};

export async function listAvailableSlots(opts?: {
  days?: number;
}): Promise<AvailabilityDay[]> {
  await ensureSalesCallBookingsSchema();
  const days = opts?.days ?? 14;
  const fromKey = madridDateKey();
  const candidates = generateSlotStarts({ fromDateKey: fromKey, days });
  if (!candidates.length) return [];

  const fromIso = candidates[0]!.toISOString();
  const toIso = slotEnd(candidates[candidates.length - 1]!).toISOString();

  const local = await sql`
    SELECT start_at AT TIME ZONE 'UTC' AS start_at
    FROM sales_call_bookings
    WHERE status = 'confirmed'
      AND start_at >= ${fromIso}::timestamptz
      AND start_at <= ${toIso}::timestamptz
  `;
  const busy = new Set<string>();
  for (const row of local.rows) {
    busy.add(new Date(String(row.start_at)).toISOString());
  }

  const peer = await fetchPeerBusy(fromIso, toIso);
  for (const b of peer) {
    busy.add(new Date(b.startAt).toISOString());
  }

  const byDay = new Map<string, AvailabilityDay>();
  for (const start of candidates) {
    const iso = start.toISOString();
    if (busy.has(iso)) continue;
    const { dateKey, dateLabel, timeLabel } = formatSlotMadrid(start);
    let day = byDay.get(dateKey);
    if (!day) {
      day = { dateKey, dateLabel, slots: [] };
      byDay.set(dateKey, day);
    }
    day.slots.push({
      startAt: iso,
      endAt: slotEnd(start).toISOString(),
      timeLabel,
    });
  }
  return [...byDay.values()];
}

export type BookSalesCallInput = {
  startAt: string;
  name: string;
  email: string;
  phone?: string;
  comments?: string;
  source?: string;
};

export async function bookSalesCall(
  input: BookSalesCallInput
): Promise<
  | { ok: true; id: string; meetingUrl: string; startAt: string; endAt: string }
  | { ok: false; error: string }
> {
  await ensureSalesCallBookingsSchema();

  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase();
  const phone = (input.phone || '').trim().slice(0, 40) || null;
  const comments = (input.comments || '').trim().slice(0, 2000) || null;
  const source = (input.source || '').trim().slice(0, 80) || null;

  if (!name || name.length < 2) return { ok: false, error: 'Indica tu nombre.' };
  if (!email.includes('@')) return { ok: false, error: 'Email no válido.' };

  const start = new Date(input.startAt);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: 'Hueco no válido.' };
  }
  if (start.getTime() < Date.now() + 55 * 60_000) {
    return { ok: false, error: 'Ese hueco ya no está disponible.' };
  }

  // Validar que el start es un hueco generado (anti-manipulación)
  const days = generateSlotStarts({
    fromDateKey: madridDateKey(),
    days: 21,
  });
  const allowed = new Set(days.map((d) => d.toISOString()));
  if (!allowed.has(start.toISOString())) {
    return { ok: false, error: 'Ese horario no está en el calendario.' };
  }

  const end = slotEnd(start);
  const avail = await listAvailableSlots({ days: 21 });
  const stillFree = avail.some((d) =>
    d.slots.some((s) => s.startAt === start.toISOString())
  );
  if (!stillFree) {
    return { ok: false, error: 'Ese hueco acaba de ocuparse. Elige otro.' };
  }

  const meetingUrl =
    salesCallMeetingUrl() ||
    'Te enviaremos el enlace de la videollamada por email';

  let inserted: { id: string } | null = null;
  try {
    const ins = await sql`
      INSERT INTO sales_call_bookings (
        project, start_at, end_at, duration_minutes,
        name, email, phone, comments, meeting_url, source, status
      )
      VALUES (
        ${SALES_CALL_PROJECT},
        ${start.toISOString()}::timestamptz,
        ${end.toISOString()}::timestamptz,
        ${SALES_CALL_DURATION_MIN},
        ${name},
        ${email},
        ${phone},
        ${comments},
        ${meetingUrl},
        ${source},
        'confirmed'
      )
      RETURNING id::text AS id
    `;
    inserted = { id: String(ins.rows[0]?.id) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      return { ok: false, error: 'Ese hueco acaba de ocuparse. Elige otro.' };
    }
    throw e;
  }

  const mirror = await mirrorBookingToPeer({
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    bookingId: inserted!.id,
    name,
    email,
  });
  if (mirror.peerId) {
    await sql`
      UPDATE sales_call_bookings
      SET peer_mirror_id = ${mirror.peerId}, updated_at = NOW()
      WHERE id = ${inserted!.id}::uuid
    `;
  }

  const fmt = formatSlotMadrid(start);
  void notifySalesCallBooked({
    id: inserted!.id,
    name,
    email,
    phone,
    comments,
    dateLabel: fmt.dateLabel,
    timeLabel: fmt.timeLabel,
    meetingUrl,
    source,
  });

  return {
    ok: true,
    id: inserted!.id,
    meetingUrl,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

export async function listLocalBusy(
  fromIso: string,
  toIso: string
): Promise<Array<{ startAt: string; endAt: string }>> {
  await ensureSalesCallBookingsSchema();
  const r = await sql`
    SELECT start_at, end_at
    FROM sales_call_bookings
    WHERE status = 'confirmed'
      AND start_at >= ${fromIso}::timestamptz
      AND start_at <= ${toIso}::timestamptz
    ORDER BY start_at ASC
  `;
  return r.rows.map((row) => ({
    startAt: new Date(String(row.start_at)).toISOString(),
    endAt: new Date(String(row.end_at)).toISOString(),
  }));
}

/** Espejo desde el peer: bloquea hueco sin datos sensibles de marketing. */
export async function upsertPeerMirror(opts: {
  startAt: string;
  endAt: string;
  remoteId: string;
  name?: string;
  email?: string;
  project?: string;
}): Promise<{ id: string }> {
  await ensureSalesCallBookingsSchema();
  const start = new Date(opts.startAt);
  const end = new Date(opts.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('invalid_range');
  }

  const existing = await sql`
    SELECT id::text AS id FROM sales_call_bookings
    WHERE peer_mirror_id = ${opts.remoteId}
       OR (status = 'confirmed' AND start_at = ${start.toISOString()}::timestamptz)
    LIMIT 1
  `;
  if (existing.rows[0]?.id) {
    return { id: String(existing.rows[0].id) };
  }

  try {
    const ins = await sql`
      INSERT INTO sales_call_bookings (
        project, start_at, end_at, duration_minutes,
        name, email, comments, status, peer_mirror_id, source
      )
      VALUES (
        'mirror',
        ${start.toISOString()}::timestamptz,
        ${end.toISOString()}::timestamptz,
        ${SALES_CALL_DURATION_MIN},
        ${'Reserva externa'},
        ${'sync@internal.local'},
        ${null},
        'confirmed',
        ${opts.remoteId},
        ${'peer_mirror'}
      )
      RETURNING id::text AS id
    `;
    return { id: String(ins.rows[0]?.id || '') };
  } catch {
    const again = await sql`
      SELECT id::text AS id FROM sales_call_bookings
      WHERE status = 'confirmed' AND start_at = ${start.toISOString()}::timestamptz
      LIMIT 1
    `;
    return { id: String(again.rows[0]?.id || '') };
  }
}
