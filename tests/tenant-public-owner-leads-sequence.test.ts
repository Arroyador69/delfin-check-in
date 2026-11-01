import { describe, expect, it } from 'vitest';
import {
  POL_FU_CLICK_DELAY_DAYS,
  POL_FU_CLICK_SECOND_DELAY_DAYS,
  POL_FU_MAX_TOUCHES_CLICK,
  POL_FU_MAX_TOUCHES_OPEN,
  POL_FU_MAX_TOUCHES_SILENT,
  POL_FU_OPEN_DELAY_DAYS,
  POL_FU_SILENT_DELAY_DAYS,
} from '../src/lib/public-owner-leads/constants';
import {
  addDaysIso,
  backfillPatchFor,
  followUpPriority,
  isFollowUpDue,
  patchAfterClicked,
  patchAfterColdSend,
  patchAfterFollowUpSent,
  patchAfterOpened,
  patchAfterSale,
  selectFollowUpDue,
  type PublicOwnerLeadSeq,
} from '../src/lib/public-owner-leads/sequence';

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

function lead(over: Partial<PublicOwnerLeadSeq> = {}): PublicOwnerLeadSeq {
  return {
    id: 'l1',
    email: 'a@casa.es',
    status: 'sent',
    sentAt: iso(-10),
    touchCount: 1,
    sequenceStatus: 'active',
    ...over,
  };
}

describe('public-owner-leads follow-up sequence', () => {
  it('delays y máximos = NFCTap', () => {
    expect([
      POL_FU_CLICK_DELAY_DAYS,
      POL_FU_CLICK_SECOND_DELAY_DAYS,
      POL_FU_OPEN_DELAY_DAYS,
      POL_FU_SILENT_DELAY_DAYS,
    ]).toEqual([2, 5, 3, 8]);
    expect([
      POL_FU_MAX_TOUCHES_CLICK,
      POL_FU_MAX_TOUCHES_OPEN,
      POL_FU_MAX_TOUCHES_SILENT,
    ]).toEqual([3, 2, 2]);
  });

  it('cold → next fu_silent +8d', () => {
    const at = '2026-01-01T00:00:00.000Z';
    const p = patchAfterColdSend(at);
    expect(p.touchCount).toBe(1);
    expect(p.nextTouchKind).toBe('fu_silent');
    expect(p.nextTouchAt).toBe(addDaysIso(at, 8));
  });

  it('open programa fu_open (+3d desde sent; vencido → ahora)', () => {
    const p = patchAfterOpened(lead({ sentAt: iso(-10) }), iso(0));
    expect(p.nextTouchKind).toBe('fu_open');
    expect(new Date(p.nextTouchAt!).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    const future = patchAfterOpened(lead({ sentAt: iso(0) }), iso(0));
    expect(new Date(future.nextTouchAt!).getTime()).toBeGreaterThan(Date.now() + 2 * DAY);
  });

  it('open no pisa click ni fu_open ya agendado', () => {
    expect(patchAfterOpened(lead({ clickedAt: iso(-1) }), iso(0))).toEqual({});
    expect(
      patchAfterOpened(lead({ nextTouchKind: 'fu_open', nextTouchAt: iso(2) }), iso(0))
    ).toEqual({});
  });

  it('click → fu_click +2d, idempotente, agotado a 3 toques', () => {
    const at = iso(0);
    const p = patchAfterClicked(lead(), at);
    expect(p.nextTouchKind).toBe('fu_click');
    expect(new Date(p.nextTouchAt!).getTime()).toBeGreaterThan(Date.now() + DAY);
    expect(
      patchAfterClicked(lead({ nextTouchKind: 'fu_click', nextTouchAt: iso(1) }), at)
    ).toEqual({});
    expect(patchAfterClicked(lead({ touchCount: 3 }), at)).toMatchObject({
      sequenceStatus: 'exhausted',
      nextTouchAt: null,
      nextTouchKind: null,
    });
  });

  it('stops no se reactivan', () => {
    const stopped = lead({ sequenceStatus: 'stopped_sale' });
    expect(patchAfterOpened(stopped, iso(0))).toEqual({});
    expect(patchAfterClicked(stopped, iso(0))).toEqual({});
    expect(patchAfterSale()).toMatchObject({ sequenceStatus: 'stopped_sale', nextTouchAt: null });
  });

  it('FU enviado: click reprograma +3d una vez; open/silent agotan', () => {
    const first = patchAfterFollowUpSent(lead({ touchCount: 1 }), 'fu_click', iso(0));
    expect(first.touchCount).toBe(2);
    expect(first.nextTouchKind).toBe('fu_click');
    const second = patchAfterFollowUpSent(lead({ touchCount: 2 }), 'fu_click', iso(0));
    expect(second.sequenceStatus).toBe('exhausted');
    expect(patchAfterFollowUpSent(lead(), 'fu_open').sequenceStatus).toBe('exhausted');
    expect(patchAfterFollowUpSent(lead(), 'fu_silent').sequenceStatus).toBe('exhausted');
  });

  it('due + prioridad A→B→C', () => {
    const c = lead({ id: 'c', email: 'c@x.es', nextTouchKind: 'fu_silent', nextTouchAt: iso(-3) });
    const b = lead({ id: 'b', email: 'b@x.es', nextTouchKind: 'fu_open', nextTouchAt: iso(-1) });
    const a = lead({ id: 'a', email: 'a@x.es', nextTouchKind: 'fu_click', nextTouchAt: iso(-1) });
    const future = lead({ id: 'f', email: 'f@x.es', nextTouchKind: 'fu_click', nextTouchAt: iso(2) });
    expect(isFollowUpDue(future)).toBe(false);
    expect(followUpPriority(a)).toBe(0);
    const picked = selectFollowUpDue([c, b, a, future], 10, new Set());
    expect(picked.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(selectFollowUpDue([c, b, a], 2, new Set(['b@x.es'])).map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('backfill: click/open/silent y due en pasado → ahora', () => {
    const nowMs = Date.now();
    const click = backfillPatchFor(lead({ clickedAt: iso(-9) }), nowMs)!;
    expect(click.tier).toBe('click');
    expect(click.patch.nextTouchKind).toBe('fu_click');
    expect(Math.abs(new Date(click.patch.nextTouchAt!).getTime() - nowMs)).toBeLessThan(2000);

    expect(backfillPatchFor(lead({ openedAt: iso(-9) }), nowMs)!.tier).toBe('open');
    const silentFuture = backfillPatchFor(lead({ sentAt: iso(-1) }), nowMs)!;
    expect(silentFuture.tier).toBe('silent');
    expect(new Date(silentFuture.patch.nextTouchAt!).getTime()).toBeGreaterThan(nowMs + 6 * DAY);

    expect(backfillPatchFor(lead({ status: 'bounced' }))!.tier).toBe('bounce');
    expect(backfillPatchFor(lead({ signedUpAt: iso(-1) }))!.tier).toBe('sale');
    expect(backfillPatchFor(lead({ optedOut: true }))!.tier).toBe('optout');
    expect(
      backfillPatchFor(lead({ nextTouchKind: 'fu_open', nextTouchAt: iso(1) }))
    ).toBeNull();
  });
});
