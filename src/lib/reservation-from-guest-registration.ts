import { sql } from '@/lib/db';
import { ensureReservationCheckinEmailColumns } from '@/lib/reservation-checkin-email-db';
import { normalizeGuestMailLocale } from '@/lib/pms-guest-checkin-email-i18n';

let columnsEnsured = false;

/** Asegura columnas y restricción de canal (idempotente). */
export async function ensureReservationGuestFormColumns(): Promise<void> {
  if (columnsEnsured) return;
  try {
    await sql`ALTER TABLE guest_registrations ADD COLUMN IF NOT EXISTS linked_reservation_id UUID`;
    await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_registration_id UUID`;
    try {
      await ensureReservationCheckinEmailColumns();
    } catch {
      /* ignore */
    }
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_guest_registration_id
      ON reservations (guest_registration_id)
      WHERE guest_registration_id IS NOT NULL
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_reservations_needs_review_tenant ON reservations (tenant_id, needs_review) WHERE needs_review = true`;
    columnsEnsured = true;
  } catch (e) {
    console.warn('[reservation-from-guest-registration] ensure columns:', e);
  }
}

function extractFirstPersona(data: Record<string, unknown>): Record<string, unknown> | null {
  const com = (data as { comunicaciones?: { personas?: unknown[] }[] })?.comunicaciones?.[0];
  const p = com?.personas?.[0];
  return p && typeof p === 'object' ? (p as Record<string, unknown>) : null;
}

function extractOptIn(data: Record<string, unknown>): boolean {
  const raw =
    (data as any)?.checkin_instructions_opt_in ??
    (data as any)?.meta?.checkin_instructions_opt_in ??
    (data as any)?.form?.checkin_instructions_opt_in ??
    (data as any)?.comunicaciones?.[0]?.contrato?.checkin_instructions_opt_in;
  return raw === true || raw === 'true' || raw === 1 || raw === '1';
}

function extractLocale(data: Record<string, unknown>): string | null {
  const raw =
    (data as any)?.ui_locale ??
    (data as any)?.meta?.ui_locale ??
    (data as any)?.form?.ui_locale ??
    (data as any)?.comunicaciones?.[0]?.contrato?.ui_locale;
  const s = String(raw || '').trim();
  if (!s) return null;
  return normalizeGuestMailLocale(s);
}

function countPersonas(data: Record<string, unknown>): number {
  const com = (data as { comunicaciones?: { personas?: unknown[]; contrato?: { numPersonas?: number } }[] })
    ?.comunicaciones?.[0];
  const n = com?.personas?.length;
  if (typeof n === 'number' && n > 0) return n;
  const np = com?.contrato?.numPersonas;
  if (typeof np === 'number' && np > 0) return np;
  return 1;
}

function buildGuestName(persona: Record<string, unknown> | null): string {
  if (!persona) return 'Huésped';
  const n = String(persona.nombre || '').trim();
  const a1 = String(persona.apellido1 || '').trim();
  const a2 = String(persona.apellido2 || '').trim();
  const parts = [n, a1, a2].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Huésped';
}

function toCheckTimestamp(dateOrIso: string, endOfDay: boolean): string {
  const s = String(dateOrIso || '').trim();
  if (!s) return new Date().toISOString().slice(0, 19);
  if (s.includes('T')) return s.length === 16 ? `${s}:00` : s;
  return endOfDay ? `${s}T23:59:59` : `${s}T14:00:00`;
}

export type SyncReservationFromGuestRegistrationInput = {
  guestRegistrationId: string;
  tenantId: string | null | undefined;
  reservaRef: string | null | undefined;
  fechaEntrada: string;
  fechaSalida: string;
  data: Record<string, unknown>;
};

export type SyncReservationResult = {
  ok: boolean;
  reservationId?: string;
  skipped?: string;
  error?: string;
};

/**
 * Crea o enlaza una fila en `reservations` tras guardar un guest_registration.
 * Idempotente por guest_registration_id. Marca needs_review hasta que el propietario complete datos.
 */
export async function syncReservationFromGuestRegistration(
  input: SyncReservationFromGuestRegistrationInput
): Promise<SyncReservationResult> {
  const tenantId = input.tenantId?.trim();
  if (!tenantId || tenantId === 'default') {
    return { ok: false, skipped: 'no_tenant' };
  }

  try {
    await ensureReservationGuestFormColumns();
  } catch {
    /* continuar; fallará la query si faltan columnas */
  }

  const grId = input.guestRegistrationId;

  try {
    const optIn = extractOptIn(input.data);
    const guestLocale = extractLocale(input.data);

    const byGr = await sql`
      SELECT id FROM reservations
      WHERE guest_registration_id = ${grId}::uuid
      LIMIT 1
    `;
    if (byGr.rows.length > 0) {
      const rid = byGr.rows[0].id as string;
      await sql`
        UPDATE guest_registrations
        SET linked_reservation_id = ${rid}
        WHERE id = ${grId}::uuid AND (linked_reservation_id IS NULL OR linked_reservation_id <> ${rid})
      `;
      // Enriquecer reserva existente con consentimiento/idioma si aún no están
      await sql`
        UPDATE reservations
        SET checkin_instructions_opt_in = COALESCE(checkin_instructions_opt_in, ${optIn}),
            guest_mail_locale = COALESCE(guest_mail_locale, ${guestLocale})
        WHERE id = ${rid}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return { ok: true, reservationId: rid };
    }

    const grLinked = await sql`
      SELECT linked_reservation_id FROM guest_registrations WHERE id = ${grId}::uuid LIMIT 1
    `;
    const existingLink = grLinked.rows[0]?.linked_reservation_id as string | null | undefined;
    if (existingLink) {
      await sql`
        UPDATE reservations
        SET checkin_instructions_opt_in = COALESCE(checkin_instructions_opt_in, ${optIn}),
            guest_mail_locale = COALESCE(guest_mail_locale, ${guestLocale})
        WHERE id = ${existingLink}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return { ok: true, reservationId: existingLink };
    }

    const persona = extractFirstPersona(input.data);
    const guestName = buildGuestName(persona);
    const guestEmail = String(persona?.correo || persona?.email || '').trim();
    const guestPhone = String(persona?.telefono || persona?.telefono2 || '').trim();

    const guestCount = countPersonas(input.data);
    const externalId = (input.reservaRef && String(input.reservaRef).trim()) || `gr-${grId}`;

    const checkIn = toCheckTimestamp(input.fechaEntrada, false);
    const checkOut = toCheckTimestamp(input.fechaSalida, true);

    const dupExt = await sql`
      SELECT id FROM reservations
      WHERE tenant_id = ${tenantId}::uuid AND external_id = ${externalId}
      LIMIT 1
    `;
    if (dupExt.rows.length > 0) {
      const rid = dupExt.rows[0].id as string;
      await sql`
        UPDATE guest_registrations SET linked_reservation_id = ${rid} WHERE id = ${grId}::uuid
      `;
      await sql`
        UPDATE reservations
        SET needs_review = true,
            guest_registration_id = COALESCE(guest_registration_id, ${grId}::uuid),
            checkin_instructions_opt_in = COALESCE(checkin_instructions_opt_in, ${optIn}),
            guest_mail_locale = COALESCE(guest_mail_locale, ${guestLocale}),
            updated_at = NOW()
        WHERE id = ${rid}
      `;
      return { ok: true, reservationId: rid };
    }

    // Anti-duplicado: si el formulario se envía 2 veces, reusar reserva directa reciente (legacy checkin_form).
    const recent = await sql`
      SELECT id
      FROM reservations
      WHERE tenant_id = ${tenantId}::uuid
        AND channel IN ('direct', 'checkin_form')
        AND COALESCE(NULLIF(TRIM(guest_name), ''), '') = ${guestName}
        AND check_in = ${checkIn}::timestamp
        AND check_out = ${checkOut}::timestamp
        AND created_at > NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 1
    `.catch(() => ({ rows: [] as any[] }));
    if (recent.rows.length > 0) {
      const rid = String(recent.rows[0].id);
      await sql`
        UPDATE guest_registrations
        SET linked_reservation_id = ${rid}
        WHERE id = ${grId}::uuid
      `;
      await sql`
        UPDATE reservations
        SET needs_review = true,
            guest_registration_id = COALESCE(guest_registration_id, ${grId}::uuid),
            checkin_instructions_opt_in = COALESCE(checkin_instructions_opt_in, ${optIn}),
            guest_mail_locale = COALESCE(guest_mail_locale, ${guestLocale}),
            updated_at = NOW()
        WHERE id = ${rid}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return { ok: true, reservationId: rid };
    }

    // En reservas creadas desde formulario, NO inventamos un "número de habitación" por defecto:
    // si no viene room_id, dejamos un placeholder y mantenemos needs_review para que el propietario lo asigne.
    const roomIdFromForm = String((input.data as any)?.room_id || '').trim();
    const resolvedRoomId = roomIdFromForm || 'UNASSIGNED';

    const ins = await sql`
      INSERT INTO reservations (
        tenant_id, external_id, room_id, guest_name, guest_email, guest_phone,
        guest_count, check_in, check_out, channel, total_price, guest_paid,
        platform_commission, net_income, currency, status, needs_review, guest_registration_id,
        checkin_instructions_opt_in, guest_mail_locale
      ) VALUES (
        ${tenantId}::uuid,
        ${externalId},
        ${resolvedRoomId},
        ${guestName},
        ${guestEmail || ''},
        ${guestPhone},
        ${guestCount},
        ${checkIn}::timestamp,
        ${checkOut}::timestamp,
        'direct',
        0,
        0,
        0,
        0,
        'EUR',
        'confirmed',
        true,
        ${grId}::uuid,
        ${optIn},
        ${guestLocale}
      )
      RETURNING id
    `;

    const rid = ins.rows[0]?.id as string;
    if (!rid) {
      return { ok: false, error: 'insert_returned_no_id' };
    }

    await sql`
      UPDATE guest_registrations SET linked_reservation_id = ${rid} WHERE id = ${grId}::uuid
    `;

    return { ok: true, reservationId: rid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[syncReservationFromGuestRegistration]', e);
    return { ok: false, error: msg };
  }
}
