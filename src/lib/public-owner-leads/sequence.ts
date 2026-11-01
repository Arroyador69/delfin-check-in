/**
 * Secuencia cold → follow-up por intención (click > open > silencio).
 * Port de NFCTap `business-leads/sequence.ts` (lógica pura, sin I/O).
 *
 * FU-A (click)   : +2d tras click, 2º FU +3d (máx 3 toques)
 * FU-B (open)    : +5d desde cold enviado (máx 2 toques)
 * FU-C (silencio): +8d desde cold enviado (máx 2 toques)
 *
 * Persistencia: ver `sequence-db.ts`, `select-followups.ts`, `backfill-followup.ts`.
 */

import {
  POL_FU_CLICK_DELAY_DAYS,
  POL_FU_CLICK_SECOND_DELAY_DAYS,
  POL_FU_MAX_TOUCHES_CLICK,
  POL_FU_MAX_TOUCHES_OPEN,
  POL_FU_MAX_TOUCHES_SILENT,
  POL_FU_OPEN_DELAY_DAYS,
  POL_FU_SILENT_DELAY_DAYS,
} from './constants';

export type TouchKind = 'cold' | 'fu_click' | 'fu_open' | 'fu_silent';

export type SequenceStatus =
  | 'active'
  | 'exhausted'
  | 'stopped_sale'
  | 'stopped_optout'
  | 'stopped_bounce';

/** Vista camelCase de la fila public_owner_leads relevante para la secuencia. */
export interface PublicOwnerLeadSeq {
  id: string;
  email: string;
  /** public_owner_leads.status: new|queued|sent|skipped|bounced|replied */
  status: string;
  optedOut?: boolean;
  sentAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  signedUpAt?: string | null;
  touchCount?: number | null;
  lastTouchAt?: string | null;
  lastTouchKind?: TouchKind | null;
  nextTouchAt?: string | null;
  nextTouchKind?: TouchKind | null;
  sequenceStatus?: SequenceStatus | null;
}

/** Campos de secuencia persistibles. `null` = limpiar columna. */
export interface SequencePatch {
  touchCount?: number;
  lastTouchAt?: string | null;
  lastTouchKind?: TouchKind | null;
  nextTouchAt?: string | null;
  nextTouchKind?: TouchKind | null;
  sequenceStatus?: SequenceStatus;
}

const CLEAR_NEXT = { nextTouchAt: null, nextTouchKind: null } as const;

export function addDaysIso(fromIso: string | Date, days: number): string {
  const d = fromIso instanceof Date ? new Date(fromIso.getTime()) : new Date(fromIso);
  d.setTime(d.getTime() + days * 86_400_000);
  return d.toISOString();
}

/** Si la fecha ya pasó → ahora (el FU queda due de inmediato). */
function clampToNow(iso: string, nowMs = Date.now()): string {
  return new Date(iso).getTime() < nowMs ? new Date(nowMs).toISOString() : iso;
}

function isStopped(lead: Pick<PublicOwnerLeadSeq, 'sequenceStatus'>): boolean {
  return (
    lead.sequenceStatus === 'stopped_sale' ||
    lead.sequenceStatus === 'stopped_optout' ||
    lead.sequenceStatus === 'stopped_bounce'
  );
}

export function maxTouchesFor(kind: TouchKind | null | undefined): number {
  if (kind === 'fu_click') return POL_FU_MAX_TOUCHES_CLICK;
  if (kind === 'fu_open') return POL_FU_MAX_TOUCHES_OPEN;
  return POL_FU_MAX_TOUCHES_SILENT;
}

export function isSequenceActive(lead: PublicOwnerLeadSeq): boolean {
  const st = lead.sequenceStatus || 'active';
  if (st !== 'active') return false;
  if (lead.optedOut) return false;
  if (lead.status === 'bounced' || lead.status === 'skipped') return false;
  if (lead.signedUpAt) return false;
  return true;
}

/** Prioridad de envío FU: menor = antes (A click, B open, C silencio). */
export function followUpPriority(lead: PublicOwnerLeadSeq): number {
  const kind = lead.nextTouchKind;
  if (kind === 'fu_click') return 0;
  if (kind === 'fu_open') return 1;
  if (kind === 'fu_silent') return 2;
  if (lead.clickedAt) return 0;
  if (lead.openedAt) return 1;
  return 2;
}

export function isFollowUpDue(lead: PublicOwnerLeadSeq, now = new Date()): boolean {
  if (!isSequenceActive(lead)) return false;
  if (lead.status !== 'sent') return false;
  const kind = lead.nextTouchKind;
  if (!kind || kind === 'cold') return false;
  if (!lead.nextTouchAt) return false;
  const touches = lead.touchCount || 1;
  if (touches >= maxTouchesFor(kind)) return false;
  return new Date(lead.nextTouchAt).getTime() <= now.getTime();
}

/** Tras cold OK. */
export function patchAfterColdSend(at = new Date().toISOString()): SequencePatch {
  return {
    touchCount: 1,
    lastTouchAt: at,
    lastTouchKind: 'cold',
    sequenceStatus: 'active',
    // Candidato silencio; open/click lo adelantan
    nextTouchAt: addDaysIso(at, POL_FU_SILENT_DELAY_DAYS),
    nextTouchKind: 'fu_silent',
  };
}

/** Open: programa FU-B si aún no hay click ni FU click pendiente. */
export function patchAfterOpened(lead: PublicOwnerLeadSeq, at: string): SequencePatch {
  if (isStopped(lead)) return {};
  if (lead.clickedAt || lead.nextTouchKind === 'fu_click') return {};
  // Ya programado FU open — no pisar en cada sync/pixel
  if (lead.nextTouchKind === 'fu_open' && lead.nextTouchAt) return {};
  const touches = lead.touchCount || 1;
  if (touches >= POL_FU_MAX_TOUCHES_OPEN) return {};
  const base = lead.sentAt || at;
  const next = clampToNow(addDaysIso(base, POL_FU_OPEN_DELAY_DAYS));
  return {
    nextTouchAt: next,
    nextTouchKind: 'fu_open',
    sequenceStatus: 'active',
  };
}

/** Click: máxima prioridad FU-A. */
export function patchAfterClicked(lead: PublicOwnerLeadSeq, at: string): SequencePatch {
  if (isStopped(lead)) return {};
  const touches = lead.touchCount || 1;
  if (touches >= POL_FU_MAX_TOUCHES_CLICK) {
    return { sequenceStatus: 'exhausted', ...CLEAR_NEXT };
  }
  // Ya en cola FU click — no retrasar con otro click/pixel
  if (lead.nextTouchKind === 'fu_click' && lead.nextTouchAt) return {};
  const next = clampToNow(addDaysIso(at, POL_FU_CLICK_DELAY_DAYS));
  return {
    nextTouchAt: next,
    nextTouchKind: 'fu_click',
    sequenceStatus: 'active',
  };
}

export function patchAfterBounce(): SequencePatch {
  return { sequenceStatus: 'stopped_bounce', ...CLEAR_NEXT };
}

/** Nota: `opted_out`/`status` de la fila los gestiona optout.ts. */
export function patchAfterOptOut(): SequencePatch {
  return { sequenceStatus: 'stopped_optout', ...CLEAR_NEXT };
}

export function patchAfterSale(): SequencePatch {
  return { sequenceStatus: 'stopped_sale', ...CLEAR_NEXT };
}

/** Tras enviar un follow-up: agendar siguiente o cerrar. */
export function patchAfterFollowUpSent(
  lead: PublicOwnerLeadSeq,
  kind: TouchKind,
  at = new Date().toISOString(),
): SequencePatch {
  const touches = (lead.touchCount || 1) + 1;
  const base: SequencePatch = {
    touchCount: touches,
    lastTouchAt: at,
    lastTouchKind: kind,
  };

  if (kind === 'fu_click' && touches < POL_FU_MAX_TOUCHES_CLICK) {
    return {
      ...base,
      nextTouchAt: addDaysIso(at, POL_FU_CLICK_SECOND_DELAY_DAYS),
      nextTouchKind: 'fu_click',
      sequenceStatus: 'active',
    };
  }

  return { ...base, ...CLEAR_NEXT, sequenceStatus: 'exhausted' };
}

/** Aplica un patch en memoria (merge; `null` limpia). */
export function mergeSequencePatch(
  lead: PublicOwnerLeadSeq,
  patch: SequencePatch,
): PublicOwnerLeadSeq {
  return { ...lead, ...patch };
}

export function selectFollowUpDue(
  leads: PublicOwnerLeadSeq[],
  n: number,
  optOut: Set<string>,
  now = new Date(),
): PublicOwnerLeadSeq[] {
  return leads
    .filter((l) => !optOut.has(l.email.toLowerCase()) && isFollowUpDue(l, now))
    .sort((a, b) => {
      const p = followUpPriority(a) - followUpPriority(b);
      if (p !== 0) return p;
      return (a.nextTouchAt || '').localeCompare(b.nextTouchAt || '');
    })
    .slice(0, Math.max(0, n));
}

/**
 * Patch de backfill para un lead ya enviado (lógica de referencia; el script
 * `backfill-followup.ts` aplica la misma regla en SQL set-based).
 * Click → +2d desde click · open → +5d desde sent · silencio → +8d desde sent.
 * Si la fecha ya pasó → next_touch_at = ahora.
 * Devuelve null si no hay nada que hacer.
 */
export function backfillPatchFor(
  lead: PublicOwnerLeadSeq,
  nowMs = Date.now(),
): { patch: SequencePatch; tier: 'click' | 'open' | 'silent' | 'bounce' | 'optout' | 'sale' } | null {
  if (lead.optedOut) {
    if (lead.sequenceStatus === 'stopped_optout') return null;
    return { patch: patchAfterOptOut(), tier: 'optout' };
  }
  if (lead.status === 'bounced') {
    if (lead.sequenceStatus === 'stopped_bounce') return null;
    return { patch: patchAfterBounce(), tier: 'bounce' };
  }
  if (lead.signedUpAt) {
    if (lead.sequenceStatus === 'stopped_sale') return null;
    return { patch: patchAfterSale(), tier: 'sale' };
  }
  if (lead.status !== 'sent') return null;
  if (isStopped(lead)) return null;
  // Ya tiene FU pendiente coherente
  if (lead.nextTouchKind && lead.nextTouchKind !== 'cold' && lead.nextTouchAt) return null;
  if ((lead.touchCount || 1) > 1 && lead.sequenceStatus === 'exhausted') return null;
  if (!lead.sentAt) return null;

  const common: SequencePatch = {
    touchCount: lead.touchCount || 1,
    lastTouchKind: lead.lastTouchKind || 'cold',
    lastTouchAt: lead.lastTouchAt || lead.sentAt,
    sequenceStatus: 'active',
  };

  if (lead.clickedAt) {
    return {
      tier: 'click',
      patch: {
        ...common,
        nextTouchKind: 'fu_click',
        nextTouchAt: clampToNow(addDaysIso(lead.clickedAt, POL_FU_CLICK_DELAY_DAYS), nowMs),
      },
    };
  }
  if (lead.openedAt) {
    return {
      tier: 'open',
      patch: {
        ...common,
        nextTouchKind: 'fu_open',
        nextTouchAt: clampToNow(addDaysIso(lead.sentAt, POL_FU_OPEN_DELAY_DAYS), nowMs),
      },
    };
  }
  return {
    tier: 'silent',
    patch: {
      ...common,
      nextTouchKind: 'fu_silent',
      nextTouchAt: clampToNow(addDaysIso(lead.sentAt, POL_FU_SILENT_DELAY_DAYS), nowMs),
    },
  };
}

export function stopStatusFor(reason: 'sale' | 'optout' | 'bounce'): SequenceStatus {
  if (reason === 'sale') return 'stopped_sale';
  if (reason === 'optout') return 'stopped_optout';
  return 'stopped_bounce';
}
