/**
 * Backfill one-shot (idempotente) de la secuencia follow-up para leads ya enviados.
 *
 * Requiere database/migration-public-owner-leads-followup.sql aplicada.
 * Misma regla que `backfillPatchFor` (sequence.ts), pero set-based en SQL:
 *   - opt-out → stopped_optout · bounced → stopped_bounce · alta → stopped_sale
 *   - click  → fu_click  a clicked_at + 2d
 *   - open   → fu_open   a sent_at   + 5d
 *   - resto  → fu_silent a sent_at   + 8d
 *   - si la fecha ya pasó → next_touch_at = NOW() (due inmediato)
 */

import { sql } from '@/lib/db';
import {
  POL_FU_CLICK_DELAY_DAYS,
  POL_FU_OPEN_DELAY_DAYS,
  POL_FU_SILENT_DELAY_DAYS,
} from './constants';

export interface BackfillFollowUpResult {
  dryRun: boolean;
  stopped: { optout: number; bounce: number; sale: number };
  scheduled: { click: number; open: number; silent: number; total: number };
  /** De los programados, cuántos quedan due ya (next_touch_at <= NOW()). */
  dueNow: { click: number; open: number; silent: number; total: number };
}

export async function backfillFollowUpSchedules(opts?: {
  dryRun?: boolean;
}): Promise<BackfillFollowUpResult> {
  const dryRun = Boolean(opts?.dryRun);
  const result: BackfillFollowUpResult = {
    dryRun,
    stopped: { optout: 0, bounce: 0, sale: 0 },
    scheduled: { click: 0, open: 0, silent: 0, total: 0 },
    dueNow: { click: 0, open: 0, silent: 0, total: 0 },
  };

  // ── 1) Stops (opt-out > bounce > venta) ──
  if (dryRun) {
    const s = await sql`
      SELECT
        COUNT(*) FILTER (WHERE opted_out = true
          AND sequence_status IS DISTINCT FROM 'stopped_optout')::int AS optout,
        COUNT(*) FILTER (WHERE opted_out = false AND status = 'bounced'
          AND sequence_status IS DISTINCT FROM 'stopped_bounce')::int AS bounce,
        COUNT(*) FILTER (WHERE opted_out = false AND status <> 'bounced'
          AND signed_up_at IS NOT NULL
          AND sequence_status IS DISTINCT FROM 'stopped_sale')::int AS sale
      FROM public_owner_leads
      WHERE COALESCE(sequence_status, 'active') NOT IN
        ('stopped_optout', 'stopped_bounce', 'stopped_sale')
    `;
    result.stopped = {
      optout: Number(s.rows[0]?.optout || 0),
      bounce: Number(s.rows[0]?.bounce || 0),
      sale: Number(s.rows[0]?.sale || 0),
    };
  } else {
    const optout = await sql`
      UPDATE public_owner_leads
      SET sequence_status = 'stopped_optout', next_touch_at = NULL, next_touch_kind = NULL,
          updated_at = NOW()
      WHERE opted_out = true
        AND COALESCE(sequence_status, 'active') NOT LIKE 'stopped_%'
      RETURNING id
    `;
    const bounce = await sql`
      UPDATE public_owner_leads
      SET sequence_status = 'stopped_bounce', next_touch_at = NULL, next_touch_kind = NULL,
          updated_at = NOW()
      WHERE status = 'bounced'
        AND COALESCE(sequence_status, 'active') NOT LIKE 'stopped_%'
      RETURNING id
    `;
    const sale = await sql`
      UPDATE public_owner_leads
      SET sequence_status = 'stopped_sale', next_touch_at = NULL, next_touch_kind = NULL,
          updated_at = NOW()
      WHERE signed_up_at IS NOT NULL
        AND COALESCE(sequence_status, 'active') NOT LIKE 'stopped_%'
      RETURNING id
    `;
    result.stopped = {
      optout: optout.rowCount || 0,
      bounce: bounce.rowCount || 0,
      sale: sale.rowCount || 0,
    };
  }

  // ── 2) Schedule FU (click > open > silent). due pasado → NOW() ──
  if (dryRun) {
    const d = await sql`
      SELECT
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS click,
        COUNT(*) FILTER (WHERE clicked_at IS NULL AND opened_at IS NOT NULL)::int AS open,
        COUNT(*) FILTER (WHERE clicked_at IS NULL AND opened_at IS NULL)::int AS silent,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL
          AND clicked_at + (${POL_FU_CLICK_DELAY_DAYS}::int * INTERVAL '1 day') <= NOW())::int AS due_click,
        COUNT(*) FILTER (WHERE clicked_at IS NULL AND opened_at IS NOT NULL
          AND sent_at + (${POL_FU_OPEN_DELAY_DAYS}::int * INTERVAL '1 day') <= NOW())::int AS due_open,
        COUNT(*) FILTER (WHERE clicked_at IS NULL AND opened_at IS NULL
          AND sent_at + (${POL_FU_SILENT_DELAY_DAYS}::int * INTERVAL '1 day') <= NOW())::int AS due_silent
      FROM public_owner_leads
      WHERE status = 'sent'
        AND opted_out = false
        AND signed_up_at IS NULL
        AND sent_at IS NOT NULL
        AND COALESCE(sequence_status, 'active') = 'active'
        AND (next_touch_kind IS NULL OR next_touch_kind = 'cold' OR next_touch_at IS NULL)
    `;
    const x = d.rows[0] || {};
    result.scheduled = {
      click: Number(x.click || 0),
      open: Number(x.open || 0),
      silent: Number(x.silent || 0),
      total: Number(x.click || 0) + Number(x.open || 0) + Number(x.silent || 0),
    };
    result.dueNow = {
      click: Number(x.due_click || 0),
      open: Number(x.due_open || 0),
      silent: Number(x.due_silent || 0),
      total: Number(x.due_click || 0) + Number(x.due_open || 0) + Number(x.due_silent || 0),
    };
    return result;
  }

  const upd = await sql`
    UPDATE public_owner_leads
    SET
      touch_count = GREATEST(COALESCE(touch_count, 0), 1),
      last_touch_kind = COALESCE(last_touch_kind, 'cold'),
      last_touch_at = COALESCE(last_touch_at, sent_at),
      sequence_status = 'active',
      next_touch_kind = CASE
        WHEN clicked_at IS NOT NULL THEN 'fu_click'
        WHEN opened_at IS NOT NULL THEN 'fu_open'
        ELSE 'fu_silent'
      END,
      next_touch_at = GREATEST(
        CASE
          WHEN clicked_at IS NOT NULL
            THEN clicked_at + (${POL_FU_CLICK_DELAY_DAYS}::int * INTERVAL '1 day')
          WHEN opened_at IS NOT NULL
            THEN sent_at + (${POL_FU_OPEN_DELAY_DAYS}::int * INTERVAL '1 day')
          ELSE sent_at + (${POL_FU_SILENT_DELAY_DAYS}::int * INTERVAL '1 day')
        END,
        NOW()
      ),
      updated_at = NOW()
    WHERE status = 'sent'
      AND opted_out = false
      AND signed_up_at IS NULL
      AND sent_at IS NOT NULL
      AND COALESCE(sequence_status, 'active') = 'active'
      AND (next_touch_kind IS NULL OR next_touch_kind = 'cold' OR next_touch_at IS NULL)
    RETURNING next_touch_kind, (next_touch_at <= NOW()) AS due_now
  `;

  for (const row of upd.rows) {
    const k = String(row.next_touch_kind);
    const due = Boolean(row.due_now);
    const tier = k === 'fu_click' ? 'click' : k === 'fu_open' ? 'open' : 'silent';
    result.scheduled[tier] += 1;
    result.scheduled.total += 1;
    if (due) {
      result.dueNow[tier] += 1;
      result.dueNow.total += 1;
    }
  }
  return result;
}
