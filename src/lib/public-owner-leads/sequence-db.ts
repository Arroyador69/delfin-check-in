/**
 * Persistencia de la secuencia follow-up (public_owner_leads).
 * Todo best-effort: si la migración aún no está aplicada, NO rompe el flujo.
 */

import { sql } from '@/lib/db';
import {
  type PublicOwnerLeadSeq,
  type SequencePatch,
  type SequenceStatus,
  type TouchKind,
  mergeSequencePatch,
  patchAfterClicked,
  patchAfterColdSend,
  patchAfterFollowUpSent,
  patchAfterOpened,
  stopStatusFor,
} from './sequence';

function iso(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Fila SQL (snake_case) → PublicOwnerLeadSeq. */
export function rowToSeqLead(r: Record<string, unknown>): PublicOwnerLeadSeq {
  return {
    id: String(r.id),
    email: String(r.email || ''),
    status: String(r.status || ''),
    optedOut: Boolean(r.opted_out),
    sentAt: iso(r.sent_at),
    openedAt: iso(r.opened_at),
    clickedAt: iso(r.clicked_at),
    signedUpAt: iso(r.signed_up_at),
    touchCount: r.touch_count == null ? 0 : Number(r.touch_count),
    lastTouchAt: iso(r.last_touch_at),
    lastTouchKind: (r.last_touch_kind as TouchKind | null) ?? null,
    nextTouchAt: iso(r.next_touch_at),
    nextTouchKind: (r.next_touch_kind as TouchKind | null) ?? null,
    sequenceStatus: (r.sequence_status as SequenceStatus | null) ?? 'active',
  };
}

export async function loadSeqLead(id: string): Promise<PublicOwnerLeadSeq | null> {
  const r = await sql`
    SELECT
      id, email, status, opted_out, sent_at, opened_at, clicked_at, signed_up_at,
      touch_count, last_touch_at, last_touch_kind, next_touch_at, next_touch_kind,
      sequence_status
    FROM public_owner_leads
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  return r.rows[0] ? rowToSeqLead(r.rows[0] as Record<string, unknown>) : null;
}

/** Lead por email_tracking.id (tid del pixel/click). */
export async function loadLeadSeqByTrackingId(
  trackingId: string,
): Promise<PublicOwnerLeadSeq | null> {
  const r = await sql`
    SELECT
      id, email, status, opted_out, sent_at, opened_at, clicked_at, signed_up_at,
      touch_count, last_touch_at, last_touch_kind, next_touch_at, next_touch_kind,
      sequence_status
    FROM public_owner_leads
    WHERE tracking_id = ${trackingId}::uuid
    LIMIT 1
  `;
  return r.rows[0] ? rowToSeqLead(r.rows[0] as Record<string, unknown>) : null;
}

/** Lee el lead por id, mergea el patch y persiste (alias cómodo de loadSeqLead+persist). */
export async function applySequencePatch(
  leadId: string,
  patch: SequencePatch,
): Promise<boolean> {
  if (!patch || Object.keys(patch).length === 0) return false;
  const lead = await loadSeqLead(leadId);
  if (!lead) return false;
  return persistSequencePatch(lead, patch);
}

/** Persiste solo columnas de secuencia (merge del lead + patch). */
export async function persistSequencePatch(
  lead: PublicOwnerLeadSeq,
  patch: SequencePatch,
): Promise<boolean> {
  if (!patch || Object.keys(patch).length === 0) return false;
  const m = mergeSequencePatch(lead, patch);
  await sql`
    UPDATE public_owner_leads
    SET
      touch_count = ${m.touchCount ?? 0},
      last_touch_at = ${m.lastTouchAt ?? null}::timestamptz,
      last_touch_kind = ${m.lastTouchKind ?? null},
      next_touch_at = ${m.nextTouchAt ?? null}::timestamptz,
      next_touch_kind = ${m.nextTouchKind ?? null},
      sequence_status = ${m.sequenceStatus ?? 'active'},
      updated_at = NOW()
    WHERE id = ${lead.id}::uuid
  `;
  return true;
}

/**
 * Tras UPDATE de opened_at/clicked_at: lee el lead completo y aplica
 * patchAfterOpened / patchAfterClicked. Nunca lanza.
 */
export async function applyEngagementToSequence(
  leadId: string,
  event: 'opened' | 'clicked',
): Promise<boolean> {
  try {
    const lead = await loadSeqLead(leadId);
    if (!lead) return false;
    const nowIso = new Date().toISOString();
    const patch =
      event === 'clicked'
        ? patchAfterClicked(lead, lead.clickedAt || nowIso)
        : patchAfterOpened(lead, lead.openedAt || nowIso);
    return await persistSequencePatch(lead, patch);
  } catch (e) {
    console.warn(
      '[public-owner-leads] sequence engagement:',
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** Tras cold OK: touch_count=1, next=fu_silent (+8d). Solo si aún no hay toques. */
export async function markColdSentSequence(leadId: string): Promise<void> {
  try {
    const p = patchAfterColdSend();
    await sql`
      UPDATE public_owner_leads
      SET
        touch_count = ${p.touchCount ?? 1},
        last_touch_at = ${p.lastTouchAt ?? null}::timestamptz,
        last_touch_kind = ${p.lastTouchKind ?? 'cold'},
        next_touch_at = ${p.nextTouchAt ?? null}::timestamptz,
        next_touch_kind = ${p.nextTouchKind ?? null},
        sequence_status = 'active'
      WHERE id = ${leadId}::uuid
        AND COALESCE(touch_count, 0) = 0
    `;
  } catch (e) {
    console.warn('[public-owner-leads] cold sequence:', e instanceof Error ? e.message : e);
  }
}

/** Tras enviar un FU: avanza toques / programa siguiente / exhausted. */
export async function markFollowUpSentSequence(
  leadId: string,
  kind: Exclude<TouchKind, 'cold'>,
): Promise<void> {
  try {
    const lead = await loadSeqLead(leadId);
    if (!lead) return;
    const p = patchAfterFollowUpSent(lead, kind);
    await persistSequencePatch(lead, p);
    await sql`
      UPDATE public_owner_leads
      SET
        tracking_id = COALESCE(tracking_id, tracking_id),
        notes = COALESCE(notes, '') || ${` | ${kind}:${new Date().toISOString().slice(0, 10)}`},
        updated_at = NOW()
      WHERE id = ${leadId}::uuid
    `;
  } catch (e) {
    console.warn('[public-owner-leads] fu sequence:', e instanceof Error ? e.message : e);
  }
}

/** Cierra la secuencia por email (venta / opt-out / bounce). Nunca lanza. */
export async function stopSequenceByEmail(
  email: string,
  reason: 'sale' | 'optout' | 'bounce' | SequenceStatus,
): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;
  try {
    const status: SequenceStatus = reason.startsWith('stopped_')
      ? (reason as SequenceStatus)
      : stopStatusFor(reason as 'sale' | 'optout' | 'bounce');
    const r = await sql`
      UPDATE public_owner_leads
      SET
        sequence_status = ${status},
        next_touch_at = NULL,
        next_touch_kind = NULL,
        updated_at = NOW()
      WHERE LOWER(TRIM(email)) = ${normalized}
        AND (sequence_status IS DISTINCT FROM ${status})
      RETURNING id
    `;
    return r.rowCount || 0;
  } catch (e) {
    console.warn(
      `[public-owner-leads] stop sequence (${reason}):`,
      e instanceof Error ? e.message : e,
    );
    return 0;
  }
}
