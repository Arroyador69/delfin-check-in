-- ========================================
-- ESQUEMA DE REFERIDOS PARA DELFÍN CHECK-IN
-- ========================================
-- Sistema completo de referidos multi-nivel
-- para propietarios que traen nuevos usuarios

-- ========================================
-- 1. AÑADIR CAMPOS A TABLA TENANTS
-- ========================================
-- Código único de referido y referencia a quién lo trajo
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkin_credits_months INTEGER DEFAULT 0 CHECK (checkin_credits_months >= 0),
  ADD COLUMN IF NOT EXISTS pro_credits_months INTEGER DEFAULT 0 CHECK (pro_credits_months >= 0);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tenants_referral_code ON tenants(referral_code);
CREATE INDEX IF NOT EXISTS idx_tenants_referred_by ON tenants(referred_by);

-- Función para generar códigos de referido únicos (REF_XXXX)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar código: REF_ seguido de 4 dígitos aleatorios
    new_code := 'REF_' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM tenants WHERE referral_code = new_code) INTO code_exists;
    
    -- Si no existe, salir del loop
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. TABLA: referrals (Relaciones de referidos)
-- ========================================
-- Primero eliminar la tabla si existe para evitar conflictos
DROP TABLE IF EXISTS referral_plan_history CASCADE;
DROP TABLE IF EXISTS referral_events CASCADE;
DROP TABLE IF EXISTS referral_rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;

CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Quién refiere (referente/owner)
  referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Quién fue referido
  referred_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Nivel en la pirámide (1 = directo, 2 = referido de referido, etc.)
  referral_level INTEGER NOT NULL DEFAULT 1 CHECK (referral_level > 0),
  
  -- Código usado para el referral
  referral_code_used VARCHAR(20) NOT NULL,
  
  -- Estado del referido
  status VARCHAR(50) NOT NULL DEFAULT 'registered' CHECK (status IN (
    'registered',      -- Solo registrado (Free)
    'active_checkin',  -- Activo en Plan Check-in
    'active_pro',      -- Activo en Plan Pro
    'cancelled',       -- Canceló su suscripción
    'past_due'         -- Pago fallido
  )),
  
  -- Información del referido al momento del registro
  referred_plan_type VARCHAR(20) CHECK (referred_plan_type IN ('free', 'checkin', 'pro')),
  
  -- Fechas importantes
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_paid_at TIMESTAMP WITH TIME ZONE, -- Primera vez que pagó
  last_paid_at TIMESTAMP WITH TIME ZONE,  -- Última vez que pagó
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Meses completos pagados (para verificar el delay de 1 mes)
  months_paid_completed INTEGER DEFAULT 0 CHECK (months_paid_completed >= 0),
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: un tenant solo puede ser referido una vez
  CONSTRAINT unique_referred_tenant UNIQUE (referred_tenant_id),
  
  -- Constraint: no se puede referir a sí mismo
  CONSTRAINT no_self_referral CHECK (referrer_tenant_id != referred_tenant_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code_used ON referrals(referral_code_used);
CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(referral_level);

-- ========================================
-- 3. TABLA: referral_events (Eventos del sistema)
-- ========================================
CREATE TABLE referral_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referred_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Tipo de evento
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'registered',           -- Nuevo referido registrado
    'plan_activated',       -- Referido activó un plan (Free → Check-in/Pro)
    'first_payment',        -- Primera vez que paga
    'month_paid',           -- Mes completo pagado (después del delay)
    'payment_failed',       -- Pago fallido
    'cancelled',            -- Canceló suscripción
    'reward_granted',       -- Recompensa otorgada
    'credit_applied',       -- Crédito aplicado
    'credit_expired',       -- Crédito expirado
    'status_changed'        -- Cambio de estado
  )),
  
  -- Detalles del evento
  event_data JSONB DEFAULT '{}'::jsonb,
  
  -- Plan relacionado si aplica
  plan_type VARCHAR(20) CHECK (plan_type IN ('free', 'checkin', 'pro')),
  
  -- Mensaje descriptivo
  message TEXT,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referral_events_referral ON referral_events(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_type ON referral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_referral_events_created ON referral_events(created_at DESC);

-- ========================================
-- 4. TABLA: referral_rewards (Recompensas otorgadas)
-- ========================================
CREATE TABLE referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  
  -- Tipo de recompensa
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN (
    'checkin_month',        -- 1 mes gratis Plan Check-in
    'pro_month',            -- 1 mes gratis Plan Pro
    'pro_2months'           -- 2 meses gratis Plan Pro
  )),
  
  -- Razón de la recompensa
  reason VARCHAR(100) NOT NULL, -- ej: "5 referidos registrados", "3 activos Check-in"
  
  -- Cantidad de meses
  months_granted INTEGER NOT NULL DEFAULT 1 CHECK (months_granted > 0),
  
  -- Referidos que contribuyeron a esta recompensa
  contributing_referrals UUID[] DEFAULT '{}', -- Array de referral_ids
  
  -- Estado de la recompensa
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Pendiente de aplicar
    'applied',    -- Aplicada (crédito consumido)
    'revoked'     -- Revocada (referido canceló)
  )),
  
  -- Fechas
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_type ON referral_rewards(reward_type);

-- ========================================
-- 5. TABLA: referral_plan_history (Historial de planes)
-- ========================================
CREATE TABLE referral_plan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  referred_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Plan anterior y nuevo
  previous_plan VARCHAR(20) CHECK (previous_plan IN ('free', 'checkin', 'pro')),
  new_plan VARCHAR(20) NOT NULL CHECK (new_plan IN ('free', 'checkin', 'pro')),
  
  -- Fecha del cambio
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Razón del cambio
  reason TEXT,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referral_plan_history_referral ON referral_plan_history(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_plan_history_tenant ON referral_plan_history(referred_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_plan_history_changed ON referral_plan_history(changed_at DESC);

-- ========================================
-- 6. TRIGGERS PARA updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_rewards_updated_at
  BEFORE UPDATE ON referral_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. FUNCIÓN: Contar referidos activos por plan
-- ========================================
CREATE OR REPLACE FUNCTION count_active_referrals_by_plan(
  p_referrer_tenant_id UUID,
  p_plan_type VARCHAR(20)
)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM referrals
  WHERE referrer_tenant_id = p_referrer_tenant_id
    AND status = CASE 
      WHEN p_plan_type = 'checkin' THEN 'active_checkin'
      WHEN p_plan_type = 'pro' THEN 'active_pro'
      ELSE status
    END
    AND months_paid_completed >= 1; -- Al menos 1 mes completo pagado
  
  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. FUNCIÓN: Contar referidos registrados
-- ========================================
CREATE OR REPLACE FUNCTION count_registered_referrals(
  p_referrer_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM referrals
  WHERE referrer_tenant_id = p_referrer_tenant_id
    AND status IN ('registered', 'active_checkin', 'active_pro');
  
  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. VISTA: Resumen de referidos por tenant
-- ========================================
CREATE OR REPLACE VIEW referral_summary AS
SELECT 
  r.referrer_tenant_id,
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT CASE WHEN r.status = 'registered' THEN r.id END) as registered_count,
  COUNT(DISTINCT CASE WHEN r.status = 'active_checkin' THEN r.id END) as active_checkin_count,
  COUNT(DISTINCT CASE WHEN r.status = 'active_pro' THEN r.id END) as active_pro_count,
  COUNT(DISTINCT CASE WHEN r.status = 'cancelled' THEN r.id END) as cancelled_count,
  COUNT(DISTINCT CASE WHEN r.months_paid_completed >= 1 THEN r.id END) as paid_referrals_count,
  MAX(r.created_at) as last_referral_date
FROM referrals r
GROUP BY r.referrer_tenant_id;

-- ========================================
-- 10. COMENTARIOS PARA DOCUMENTACIÓN
-- ========================================
COMMENT ON TABLE referrals IS 'Relaciones entre referentes y referidos en el sistema multi-nivel';
COMMENT ON TABLE referral_events IS 'Eventos del sistema de referidos (registros, pagos, cancelaciones)';
COMMENT ON TABLE referral_rewards IS 'Recompensas otorgadas a los referentes (meses gratis)';
COMMENT ON TABLE referral_plan_history IS 'Historial de cambios de plan de los referidos';
COMMENT ON FUNCTION generate_referral_code() IS 'Genera un código único de referido (REF_XXXX)';
COMMENT ON FUNCTION count_active_referrals_by_plan(UUID, VARCHAR) IS 'Cuenta referidos activos por plan (Check-in o Pro)';
COMMENT ON FUNCTION count_registered_referrals(UUID) IS 'Cuenta el total de referidos registrados';
