-- ==========================================
-- Follow-up outreach (secuencia cold → FU click > open > silencio)
-- Port del motor NFCTap business-leads/sequence.
-- Idempotente. Ejecutar ANTES del backfill:
--   psql "$DATABASE_URL" -f database/migration-public-owner-leads-followup.sql
--   npx tsx scripts/public-owner-leads/backfill-followup.ts [--dry-run]
-- ==========================================

ALTER TABLE public_owner_leads
  ADD COLUMN IF NOT EXISTS touch_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_touch_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_touch_kind VARCHAR(20),
  ADD COLUMN IF NOT EXISTS next_touch_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_touch_kind VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sequence_status VARCHAR(30) DEFAULT 'active';

-- Leads due para follow-up (select-followups.ts): sent + secuencia activa + next_touch_at
CREATE INDEX IF NOT EXISTS idx_pol_fu_due
  ON public_owner_leads (next_touch_at, next_touch_kind)
  WHERE status = 'sent'
    AND sequence_status = 'active'
    AND next_touch_at IS NOT NULL;

COMMENT ON COLUMN public_owner_leads.touch_count IS
  'Toques enviados (cold incluido). 1 tras cold; máx 3 click / 2 open / 2 silencio';
COMMENT ON COLUMN public_owner_leads.next_touch_kind IS
  'fu_click (A) | fu_open (B) | fu_silent (C); NULL si no hay FU pendiente';
COMMENT ON COLUMN public_owner_leads.sequence_status IS
  'active | exhausted | stopped_sale | stopped_optout | stopped_bounce';
