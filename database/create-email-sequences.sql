-- ==========================================
-- SECUENCIAS DE EMAIL (Lifecycle / Nurture)
-- Fase 1: activación onboarding | Fase 2: conversión a plan de pago
-- ==========================================

CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phase INTEGER NOT NULL DEFAULT 1,
  goal_description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  template_key VARCHAR(80) NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  condition_json JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_sequence ON email_sequence_steps(sequence_id, step_order);

CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_email_enrollments_status_next ON email_sequence_enrollments(status, next_send_at);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_tenant ON email_sequence_enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_sequence ON email_sequence_enrollments(sequence_id);

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  scope VARCHAR(50) DEFAULT 'lifecycle'
    CHECK (scope IN ('all', 'lifecycle', 'marketing')),
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, scope)
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(LOWER(email));

COMMENT ON TABLE email_sequences IS 'Definición de secuencias de nurture (Fase 1 activación, Fase 2 upgrade)';
COMMENT ON TABLE email_sequence_steps IS 'Pasos de cada secuencia con delay y condiciones';
COMMENT ON TABLE email_sequence_enrollments IS 'Inscripción de un tenant en una secuencia';
COMMENT ON TABLE email_unsubscribes IS 'Bajas RGPD/LSSI de emails comerciales de lifecycle';
