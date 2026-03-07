-- ==========================================
-- Encuesta Waitlist: respuestas y campañas
-- campaign_key se guarda en email_tracking.metadata
-- ==========================================

-- Respuestas de la encuesta (una por destinatario/campaña)
CREATE TABLE IF NOT EXISTS waitlist_survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_tracking_id UUID REFERENCES email_tracking(id) ON DELETE SET NULL,
  campaign_key VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_survey_responses_campaign ON waitlist_survey_responses(campaign_key);
CREATE INDEX IF NOT EXISTS idx_waitlist_survey_responses_email ON waitlist_survey_responses(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_survey_responses_tracking ON waitlist_survey_responses(email_tracking_id);

COMMENT ON TABLE waitlist_survey_responses IS 'Respuestas de encuestas enviadas a la waitlist (campaign_key en email_tracking.metadata)';
