-- ==========================================
-- Leads de propietarios (emails públicos en web)
-- Pipeline legal / RGPD-aware — ver docs/growth/PUBLIC_LEADS_PIPELINE.md
-- ==========================================

CREATE TABLE IF NOT EXISTS public_owner_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  source_url TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'queued', 'sent', 'skipped', 'bounced', 'replied')),
  opted_out BOOLEAN NOT NULL DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_public_owner_leads_status
  ON public_owner_leads (status)
  WHERE opted_out = false;

CREATE INDEX IF NOT EXISTS idx_public_owner_leads_domain
  ON public_owner_leads (LOWER(domain));

CREATE INDEX IF NOT EXISTS idx_public_owner_leads_opted_out
  ON public_owner_leads (opted_out)
  WHERE opted_out = true;

COMMENT ON TABLE public_owner_leads IS
  'Leads B2B con email publicado en web del alojamiento; no OTAs ni redes sociales';
COMMENT ON COLUMN public_owner_leads.source_url IS
  'URL pública de donde se vio el email (mailto o HTML)';
COMMENT ON COLUMN public_owner_leads.opted_out IS
  'Baja honorada; no reenviar outreach';
