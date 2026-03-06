-- =====================================================
-- Migración: Añadir plan Standard a los 4 planes
-- =====================================================
-- Ejecutar en Neon después de desplegar el código que usa plan_type 'standard'.
-- Permite plan_type = 'standard' en tenants y en tablas de referidos.
-- =====================================================

-- 0. Normalizar valores legacy (free_legal -> checkin) antes de añadir CHECK
UPDATE tenants
SET plan_type = 'checkin'
WHERE plan_type IS NULL OR plan_type NOT IN ('free', 'checkin', 'standard', 'pro');

-- 1. Tenants: permitir plan_type 'standard'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tenants' AND constraint_name = 'tenants_plan_type_check'
  ) THEN
    ALTER TABLE tenants DROP CONSTRAINT tenants_plan_type_check;
  END IF;
  ALTER TABLE tenants
    ADD CONSTRAINT tenants_plan_type_check
    CHECK (plan_type IN ('free', 'checkin', 'standard', 'pro'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'tenants_plan_type_check: %', SQLERRM;
END $$;

-- 2. Referrals: referred_plan_type (si existe la columna)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referrals' AND column_name = 'referred_plan_type'
  ) THEN
    ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referred_plan_type_check;
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_referred_plan_type_check
      CHECK (referred_plan_type IN ('free', 'checkin', 'standard', 'pro'));
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'referrals referred_plan_type: %', SQLERRM;
END $$;

-- 3. referral_plan_history.plan_type (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_plan_history' AND column_name = 'new_plan'
  ) THEN
    ALTER TABLE referral_plan_history DROP CONSTRAINT IF EXISTS referral_plan_history_new_plan_check;
    ALTER TABLE referral_plan_history
      ADD CONSTRAINT referral_plan_history_new_plan_check
      CHECK (new_plan IN ('free', 'checkin', 'standard', 'pro'));
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'referral_plan_history: %', SQLERRM;
END $$;

COMMENT ON CONSTRAINT tenants_plan_type_check ON tenants IS 'Planes: free, checkin, standard, pro (ver PLANS.md)';
