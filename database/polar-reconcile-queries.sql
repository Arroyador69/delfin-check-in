-- Polar — consultas de reconciliación (solo lectura + plantillas comentadas)
-- Ejecutar en Neon producción tras webhook Enabled + deliveries 200.

-- =============================================================================
-- 1) AFECTADOS: intentaron pagar pero siguen en plan free
-- =============================================================================
SELECT
  id,
  email,
  name,
  plan_type,
  legal_module,
  polar_subscription_id,
  polar_subscription_status,
  polar_customer_id,
  onboarding_status,
  polar_last_upgrade_intent_at,
  polar_last_checkout_context->>'plan' AS plan_intentado,
  polar_last_checkout_context->>'source' AS origen,
  polar_last_checkout_context->>'rooms' AS unidades
FROM tenants
WHERE polar_last_checkout_context IS NOT NULL
  AND COALESCE(plan_type, 'free') = 'free'
  AND polar_last_upgrade_intent_at >= NOW() - INTERVAL '60 days'
ORDER BY polar_last_upgrade_intent_at DESC;

-- =============================================================================
-- 2) DESINCRONIZADOS: tienen suscripción Polar activa pero plan free en BD
-- =============================================================================
SELECT
  id,
  email,
  plan_type,
  legal_module,
  polar_subscription_id,
  polar_subscription_status,
  polar_last_event_at
FROM tenants
WHERE polar_subscription_id IS NOT NULL
  AND polar_subscription_status IN ('active', 'trialing')
  AND COALESCE(plan_type, 'free') = 'free'
ORDER BY polar_last_event_at DESC NULLS LAST;

-- =============================================================================
-- 3) VERIFICACIÓN FINAL (debe devolver 0 filas cuando todo esté arreglado)
-- =============================================================================
SELECT COUNT(*) AS pendientes_desincronizados
FROM tenants
WHERE polar_subscription_id IS NOT NULL
  AND polar_subscription_status IN ('active', 'trialing')
  AND COALESCE(plan_type, 'free') = 'free';

-- =============================================================================
-- ARREGLO RECOMENDADO (en Polar, no SQL):
--   Customers → email del cliente → Subscription → Redeliver subscription.active
-- Requisito: webhook Enabled + URL /api/webhook/polar + deliveries 200
--
-- ARREGLO MANUAL SQL (solo si Redeliver no es posible):
-- Sustituir UUID y plan según plan_intentado (checkin | standard | pro)
-- =============================================================================

-- Plan Check-in (ejemplo)
-- UPDATE tenants SET
--   plan_type = 'checkin', plan_id = 'premium', ads_enabled = true, legal_module = true,
--   max_rooms = -1, max_rooms_included = 0, base_plan_price = 2.00, extra_room_price = 2.00,
--   polar_subscription_status = 'active', updated_at = NOW()
-- WHERE id = 'UUID_DEL_TENANT';
