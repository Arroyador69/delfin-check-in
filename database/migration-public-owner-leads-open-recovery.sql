-- Recovery opens: exhausted FU A/B/C + abrieron + sin alta → R1/R2.
-- Idempotente. También se aplica en runtime vía ensure-recovery-schema.ts.

ALTER TABLE public_owner_leads
  ADD COLUMN IF NOT EXISTS recovery_touch_count INTEGER DEFAULT 0;

ALTER TABLE public_owner_leads
  ADD COLUMN IF NOT EXISTS recovery_status VARCHAR(32);

COMMENT ON COLUMN public_owner_leads.recovery_status IS
  'active | exhausted | NULL (nunca entró en recovery de opens)';

COMMENT ON COLUMN public_owner_leads.recovery_touch_count IS
  'Toques R1/R2 enviados (máx 2). Independiente de touch_count del FU A/B/C.';

CREATE INDEX IF NOT EXISTS idx_pol_recovery_due
  ON public_owner_leads (next_touch_at)
  WHERE next_touch_kind = 'fu_recovery'
    AND COALESCE(recovery_status, '') = 'active';
