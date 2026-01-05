-- ==========================================
-- TABLAS PARA TRACKING DE SUPERADMIN
-- Métricas, Afiliados, Referidos, Emails, Actividad
-- ==========================================

-- 1. AFILIADOS (personas que venden Delfín)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL, -- Código único del afiliado
  referral_link TEXT NOT NULL, -- Link único de referido
  commission_rate DECIMAL(5,2) DEFAULT 25.00, -- % de comisión (ej: 25%)
  commission_months INTEGER DEFAULT 12, -- Meses que dura la comisión
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked', 'inactive')),
  total_users_brought INTEGER DEFAULT 0, -- Usuarios traídos
  total_revenue_generated DECIMAL(10,2) DEFAULT 0, -- Ingresos generados
  total_commission_earned DECIMAL(10,2) DEFAULT 0, -- Comisión acumulada
  total_commission_paid DECIMAL(10,2) DEFAULT 0, -- Comisión pagada
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

-- 2. REFERIDOS (usuarios que invitan a otros)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- Usuario que invita
  referred_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- Usuario invitado
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL, -- Si viene de afiliado
  referral_code VARCHAR(50), -- Código usado
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'converted', 'expired')),
  -- converted = invitado se convirtió a pago
  activated_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  discount_applied DECIMAL(10,2) DEFAULT 0, -- Descuento aplicado al invitado
  reward_applied DECIMAL(10,2) DEFAULT 0, -- Recompensa aplicada al referrer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 3. TRACKING DE EMAILS
CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  email_type VARCHAR(50) NOT NULL, -- 'onboarding', 'legal_notice', 'upsell', 'incident', 'custom'
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  message_id VARCHAR(255), -- ID del proveedor de email
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  click_url TEXT, -- URL clickeada
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  conversion_type VARCHAR(50), -- 'signup', 'payment', 'upgrade', etc.
  conversion_value DECIMAL(10,2), -- Valor de la conversión
  metadata JSONB, -- Datos adicionales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_tenant ON email_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(email_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);
CREATE INDEX IF NOT EXISTS idx_email_tracking_created ON email_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);

-- 4. ACTIVIDAD DE USUARIOS (para DAU/WAU/MAU)
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID, -- tenant_user_id si aplica
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'checkin', 'xml_sent', 'property_created', 'reservation_created', etc.
  activity_data JSONB, -- Datos adicionales de la actividad
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_tenant ON user_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_date ON user_activity(tenant_id, created_at DESC);

-- 5. EVENTOS DE FUNNEL
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'signup', 'property_created', 'first_checkin', 'xml_sent', 'payment'
  event_data JSONB, -- Datos del evento
  step_number INTEGER NOT NULL, -- Paso en el funnel (1, 2, 3, 4, 5)
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_to_complete INTERVAL, -- Tiempo desde el paso anterior
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_tenant ON funnel_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_events_step ON funnel_events(step_number);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created ON funnel_events(created_at DESC);

-- 6. TRACKING DE XML/MIR (para métricas legales)
CREATE TABLE IF NOT EXISTS xml_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES tenant_properties(id) ON DELETE SET NULL,
  guest_registration_id UUID REFERENCES guest_registrations(id) ON DELETE SET NULL,
  xml_type VARCHAR(50) NOT NULL, -- 'PV', 'RH', 'both'
  sent_to VARCHAR(50) NOT NULL, -- 'MIR', 'SES', 'both'
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'error', 'retry')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  time_to_send INTERVAL, -- Tiempo desde check-in hasta envío
  metadata JSONB, -- Respuesta del MIR/SES
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xml_tracking_tenant ON xml_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xml_tracking_status ON xml_tracking(status);
CREATE INDEX IF NOT EXISTS idx_xml_tracking_sent ON xml_tracking(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_xml_tracking_created ON xml_tracking(created_at DESC);

-- 7. PAGOS Y SUSCRIPCIONES (para métricas de ingresos)
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'subscription_started', 'subscription_upgraded', 'subscription_downgraded', 'subscription_cancelled', 'payment_received'
  plan_type VARCHAR(50) NOT NULL, -- 'free', 'free_legal', 'pro'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  payment_method VARCHAR(50), -- 'stripe', 'bank_transfer', etc.
  stripe_invoice_id VARCHAR(255),
  period_start DATE NOT NULL,
  period_end DATE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON subscription_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_plan ON subscription_events(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_period ON subscription_events(period_start DESC);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_tracking_updated_at
    BEFORE UPDATE ON email_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_xml_tracking_updated_at
    BEFORE UPDATE ON xml_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE affiliates IS 'Afiliados que promocionan Delfín Check-in';
COMMENT ON TABLE referrals IS 'Sistema de referidos entre usuarios';
COMMENT ON TABLE email_tracking IS 'Tracking completo de emails enviados';
COMMENT ON TABLE user_activity IS 'Actividad de usuarios para calcular DAU/WAU/MAU';
COMMENT ON TABLE funnel_events IS 'Eventos del funnel de conversión';
COMMENT ON TABLE xml_tracking IS 'Tracking de envíos XML al MIR/SES';
COMMENT ON TABLE subscription_events IS 'Eventos de suscripciones y pagos';

