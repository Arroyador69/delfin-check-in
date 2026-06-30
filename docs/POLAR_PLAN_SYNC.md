# Polar — activación automática de plan tras pago

## Problema (corregido en PR)

Tras pagar en Polar (`/api/polar/upgrade`), el webhook guardaba `polar_subscription_id` pero **no** actualizaba `plan_type`, `legal_module`, etc. El usuario seguía en Plan Básico aunque Polar cobrara.

## Solución en código

- `src/lib/polar-plan-config.ts` — configuración de planes (checkin / standard / pro / free)
- `src/lib/polar-subscription-sync.ts` — sincroniza tenant al recibir `subscription.active|updated|...`
- `src/app/api/webhook/polar/route.ts` — llama a `syncTenantFromPolarSubscription` en cada evento de suscripción

Tras un pago exitoso, el tenant debe quedar con el plan correcto y `legal_module = true` en Check-in/Standard/Pro.

## Migración BD (ejecutar en Neon si falla el SQL de reconciliación)

```bash
# Archivo: database/migration-polar-tenant-columns.sql
```

## 1. Arreglo inmediato — clientes que ya pagaron

### Paso A — Migración columnas Polar

Ejecuta `database/migration-polar-tenant-columns.sql` en Neon.

### Paso B — Encontrar afectados (sin depender de polar_subscription_id)

```sql
SELECT
  id,
  email,
  name,
  plan_type,
  legal_module,
  polar_last_upgrade_intent_at,
  polar_last_checkout_context
FROM tenants
WHERE polar_last_checkout_context IS NOT NULL
  AND COALESCE(plan_type, 'free') IN ('free')
  AND polar_last_upgrade_intent_at >= NOW() - INTERVAL '60 days'
ORDER BY polar_last_upgrade_intent_at DESC;
```

El campo `polar_last_checkout_context->>'plan'` indica el plan que intentaron contratar (`checkin`, `standard`, `pro`).

### Paso C — Activar Plan Check-in (Laszlo y similares)

```sql
UPDATE tenants
SET
  plan_type = 'checkin',
  plan_id = 'premium',
  ads_enabled = true,
  legal_module = true,
  max_rooms = -1,
  max_rooms_included = 0,
  base_plan_price = 2.00,
  extra_room_price = 2.00,
  polar_subscription_status = 'active',
  updated_at = NOW()
WHERE id = '8d090078-efc3-467a-b48e-e8442bcc0a06';
-- o: WHERE LOWER(email) = LOWER('paraisosur7@hotmail.com');
```

### Paso D — Plan Standard

```sql
UPDATE tenants
SET
  plan_type = 'standard',
  plan_id = 'standard',
  ads_enabled = false,
  legal_module = true,
  max_rooms = -1,
  max_rooms_included = 4,
  base_plan_price = 9.99,
  extra_room_price = 2.00,
  polar_subscription_status = 'active',
  updated_at = NOW()
WHERE id = 'UUID_DEL_TENANT';
```

### Paso E — Plan Pro

```sql
UPDATE tenants
SET
  plan_type = 'pro',
  plan_id = 'enterprise',
  ads_enabled = false,
  legal_module = true,
  max_rooms = -1,
  max_rooms_included = 6,
  base_plan_price = 29.99,
  extra_room_price = 2.00,
  polar_subscription_status = 'active',
  updated_at = NOW()
WHERE id = 'UUID_DEL_TENANT';
```

## 2. Tras deploy — reenviar webhook en Polar (opcional)

Polar Dashboard → suscripción del cliente → reenviar evento `subscription.active` al webhook.

URL: `https://admin.delfincheckin.com/api/webhook/polar`

## 3. Verificación

1. Tenant en admin muestra **Plan Check-in** (no Básico)
2. **Sin** banner «Activar Módulo MIR»
3. Envío automático MIR disponible (`legal_module = true`)
4. Logs Vercel: `✅ [polar sync] plan=checkin tenant=...`

## 4. Reconciliación post-migración

```sql
SELECT id, email, plan_type, polar_subscription_id, polar_subscription_status
FROM tenants
WHERE polar_subscription_id IS NOT NULL
  AND polar_subscription_status IN ('active', 'trialing')
  AND COALESCE(plan_type, 'free') = 'free';
```

Debe devolver **0 filas** tras arreglar manualmente los casos pendientes.

## 5. Post-pago en onboarding (2026)

- `pollCheckoutCompletion` usa `polar_subscription_status` / `legal_module` (no `subscription_status` de Stripe).
- `POST /api/polar/confirm-payment` sincroniza desde Polar si el webhook va tarde.
- Tras `subscription.active`, email con magic link si `onboarding_status != 'completed'`.
- Checkout con sesión fuerza `customerEmail` del tenant en Polar (evita duplicados Gmail/Yahoo).

### Arreglo manual — email distinto en Polar vs tenant

```sql
SELECT id, email, plan_type, legal_module, polar_subscription_id, polar_customer_id,
       onboarding_status, polar_last_checkout_context
FROM tenants
WHERE LOWER(email) IN ('gabbyfrancy@yahoo.it', 'gabbyfrancy67@gmail.com');
```

Activar plan en el tenant correcto y alinear `polar_customer_id` con el cliente Polar que pagó.
