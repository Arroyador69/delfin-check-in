/**
 * SELECT de follow-ups due: A (click) → B (open) → C (silencio), LIMIT n.
 * Excluye opt-out, bounce, venta y emails en email_unsubscribes.
 */

import { sql } from '@/lib/db';
import {
  POL_FU_MAX_TOUCHES_CLICK,
  POL_FU_MAX_TOUCHES_OPEN,
  POL_FU_MAX_TOUCHES_SILENT,
} from './constants';
import type { PublicOwnerLeadSeq } from './sequence';
import { rowToSeqLead } from './sequence-db';

export interface DueFollowUp extends PublicOwnerLeadSeq {
  domain: string;
  sourceUrl: string;
  notes: string | null;
  /** 0 = A click, 1 = B open, 2 = C silent */
  priority: number;
}

export async function selectDueFollowUps(limit: number): Promise<DueFollowUp[]> {
  const n = Math.max(0, Math.floor(limit));
  if (n === 0) return [];

  const r = await sql`
    SELECT
      l.id, l.email, l.domain, l.source_url, l.notes, l.status, l.opted_out,
      l.sent_at, l.opened_at, l.clicked_at, l.signed_up_at,
      l.touch_count, l.last_touch_at, l.last_touch_kind,
      l.next_touch_at, l.next_touch_kind, l.sequence_status
    FROM public_owner_leads l
    WHERE l.status = 'sent'
      AND l.opted_out = false
      AND l.signed_up_at IS NULL
      AND COALESCE(l.sequence_status, 'active') = 'active'
      AND l.next_touch_kind IN ('fu_click', 'fu_open', 'fu_silent')
      AND l.next_touch_at IS NOT NULL
      AND l.next_touch_at <= NOW()
      AND GREATEST(COALESCE(l.touch_count, 0), 1) < (
        CASE l.next_touch_kind
          WHEN 'fu_click' THEN ${POL_FU_MAX_TOUCHES_CLICK}::int
          WHEN 'fu_open' THEN ${POL_FU_MAX_TOUCHES_OPEN}::int
          ELSE ${POL_FU_MAX_TOUCHES_SILENT}::int
        END
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_unsubscribes u
        WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(l.email))
      )
    ORDER BY
      CASE l.next_touch_kind
        WHEN 'fu_click' THEN 0
        WHEN 'fu_open' THEN 1
        ELSE 2
      END ASC,
      l.next_touch_at ASC
    LIMIT ${n}
  `;

  return r.rows.map((row) => {
    const lead = rowToSeqLead(row as Record<string, unknown>);
    const k = lead.nextTouchKind;
    return {
      ...lead,
      domain: String(row.domain || ''),
      sourceUrl: String(row.source_url || ''),
      notes: row.notes == null ? null : String(row.notes),
      priority: k === 'fu_click' ? 0 : k === 'fu_open' ? 1 : 2,
    };
  });
}

/** Contadores por tier (due ahora / programados) para stats y Telegram. */
export async function followUpCounts(): Promise<{
  dueClick: number;
  dueOpen: number;
  dueSilent: number;
  scheduledClick: number;
  scheduledOpen: number;
  scheduledSilent: number;
  stoppedSale: number;
  exhausted: number;
}> {
  const r = await sql`
    SELECT
      COUNT(*) FILTER (WHERE next_touch_kind = 'fu_click' AND next_touch_at <= NOW())::int AS due_click,
      COUNT(*) FILTER (WHERE next_touch_kind = 'fu_open' AND next_touch_at <= NOW())::int AS due_open,
      COUNT(*) FILTER (WHERE next_touch_kind = 'fu_silent' AND next_touch_at <= NOW())::int AS due_silent,
      COUNT(*) FILTER (WHERE next_touch_kind = 'fu_click')::int AS sch_click,
      COUNT(*) FILTER (WHERE next_touch_kind = 'fu_open')::int AS sch_open,
      COUNT(*) FILTER (WHERE next_touch_kind = 'fu_silent')::int AS sch_silent
    FROM public_owner_leads
    WHERE status = 'sent'
      AND opted_out = false
      AND signed_up_at IS NULL
      AND COALESCE(sequence_status, 'active') = 'active'
      AND next_touch_at IS NOT NULL
  `;
  const stopped = await sql`
    SELECT
      COUNT(*) FILTER (WHERE sequence_status = 'stopped_sale')::int AS stopped_sale,
      COUNT(*) FILTER (WHERE sequence_status = 'exhausted')::int AS exhausted
    FROM public_owner_leads
    WHERE sequence_status IN ('stopped_sale', 'exhausted')
  `;
  const x = r.rows[0] || {};
  const y = stopped.rows[0] || {};
  return {
    dueClick: Number(x.due_click || 0),
    dueOpen: Number(x.due_open || 0),
    dueSilent: Number(x.due_silent || 0),
    scheduledClick: Number(x.sch_click || 0),
    scheduledOpen: Number(x.sch_open || 0),
    scheduledSilent: Number(x.sch_silent || 0),
    stoppedSale: Number(y.stopped_sale || 0),
    exhausted: Number(y.exhausted || 0),
  };
}
