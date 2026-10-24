-- ==========================================
-- Tracking campaña public-owner-leads (opens/clicks/altas)
-- + cola de URLs fuente para descubrimiento diario
-- ==========================================

ALTER TABLE public_owner_leads
  ADD COLUMN IF NOT EXISTS tracking_id UUID,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_up_tenant_id UUID,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_public_owner_leads_sent_at
  ON public_owner_leads (sent_at DESC)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_public_owner_leads_tracking
  ON public_owner_leads (tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_public_owner_leads_signed_up
  ON public_owner_leads (signed_up_at DESC)
  WHERE signed_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public_owner_lead_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'failed', 'blocked')),
  last_error TEXT,
  emails_found INT NOT NULL DEFAULT 0,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (url)
);

CREATE INDEX IF NOT EXISTS idx_public_owner_lead_sources_pending
  ON public_owner_lead_sources (created_at ASC)
  WHERE status = 'pending';

COMMENT ON TABLE public_owner_lead_sources IS
  'URLs de webs propias de alojamientos (España) a scrapear para emails públicos';
COMMENT ON COLUMN public_owner_leads.tracking_id IS
  'FK lógica a email_tracking.id para opens/clicks';
COMMENT ON COLUMN public_owner_leads.signed_up_at IS
  'Alta gratis atribuida cuando el email del lead se registra';
