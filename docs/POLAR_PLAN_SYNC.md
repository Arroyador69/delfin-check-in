# Polar — activación automática de plan tras pago

## 0. Configuración en condiciones (checklist obligatorio)

### Polar Dashboard → Webhooks

| Campo | Valor correcto |
|-------|----------------|
| **URL** | `https://admin.delfincheckin.com/api/webhook/polar` |
| **Formato** | Raw (JSON) |
| **Estado** | **Enabled** (el toggle debe estar activo; si pone "Disabled", Polar no envía nada) |

**URL incorrecta (da 401):** `/api/webhooks` o `/api/webhooks/polar` → el middleware responde `No autorizado - tenant_id requerido`.

**Eventos mínimos recomendados:** `checkout.created`, `checkout.updated`, `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.revoked`.

Tras crear o editar el endpoint: copiar el **Secret** (`whsec_...` o el que muestre Polar) a Vercel.

### Vercel → Environment Variables (Production)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `POLAR_WEBHOOK_SECRET` | Sí | Secret del webhook en Polar (mismo que en el dashboard) |
| `POLAR_ACCESS_TOKEN` | Sí | Organization Access Token de **producción** (`polar_pat_...`) |
| `POLAR_SERVER` | Sí | `production` |
| `NEXT_PUBLIC_APP_URL` | Sí | `https://admin.delfincheckin.com` |
| `POLAR_PRODUCT_CHECKIN_ID` | Sí | UUID producto Check-in mensual |
| `POLAR_PRODUCT_STANDARD_ID` | Sí | UUID producto Standard mensual |
| `POLAR_PRODUCT_PRO_ID` | Sí | UUID producto Pro mensual |
| `POLAR_PRODUCT_*_YEARLY_ID` | Si hay anual | IDs de productos anuales |
| `POLAR_PRODUCT_FREE_EXTRA_UNITS_ID` | Opcional | Unidades extra plan free |

Tras cambiar variables: **Redeploy** en Vercel (sin redeploy no aplican).

### Neon (una vez)

Ejecutar `database/migration-polar-tenant-columns.sql`.

### Diagnóstico de errores en Polar → Deliveries

| HTTP | Response body | Causa | Acción |
|------|---------------|-------|--------|
| — | Sin filas nuevas | Webhook **Disabled** | Activar el toggle en Polar |
| 401 | `tenant_id requerido` | URL mal (`/api/webhooks...`) | Corregir a `/api/webhook/polar` |
| 403 | `{"received":false}` | Secret incorrecto en Vercel | Copiar secret de Polar → `POLAR_WEBHOOK_SECRET` → redeploy |
| 200 | `{"received":true}` | OK | — |

### Verificación tras arreglar

1. Polar → Redeliver en un evento → debe ser **200** en &lt;15 s.
2. Pago test → en Neon: `plan_type` ≠ `free`, `legal_module` = true.
3. Logs Vercel: `✅ [polar sync] plan=checkin tenant=...`

Docs Polar: [Setup Webhooks](https://polar.sh/docs/integrate/webhooks/endpoints), [Next.js](https://polar.sh/docs/guides/nextjs).

---

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

## 6. Reconciliación paso a paso (playbook)

Usar cuando el webhook estuvo **Disabled**, en **401** o con secret incorrecto, y hay clientes que **pagaron en Polar** pero en Delfín siguen en **Plan Básico**.

Archivo SQL listo para Neon: `database/polar-reconcile-queries.sql`

### Paso 1 — Confirmar que el webhook ya funciona

1. Polar → Webhook **Enabled**
2. URL: `https://admin.delfincheckin.com/api/webhook/polar`
3. Redeliver de prueba → **200** `{"received":true}`

Si no hay 200, **no reconciliar aún** (los Redeliver seguirán fallando).

### Paso 2 — Listar afectados en Neon

Ejecuta la **consulta 1** y **consulta 2** de `database/polar-reconcile-queries.sql`.

Anota por cada fila: `email`, `id`, `plan_intentado` (`checkin` / `standard` / `pro`).

### Paso 3 — Arreglar cada cliente (orden recomendado)

**Opción A — Automática (preferida):**

1. Polar → **Customers** → buscar por email
2. Abrir la **suscripción activa**
3. En eventos / deliveries → **Redeliver** `subscription.active`
4. Comprobar delivery **200**
5. En Neon:

```sql
SELECT email, plan_type, legal_module, polar_subscription_status
FROM tenants WHERE LOWER(email) = LOWER('email@cliente.com');
```

Debe mostrar el plan de pago y `legal_module = true`.

**Opción B — SQL manual:** si no hay suscripción en Polar o Redeliver no aplica, usar los UPDATE de las secciones 1.C–1.E de este doc según `plan_intentado`.

**Opción C — Email de onboarding:** si el cliente no completó setup, SuperAdmin o `/api/onboarding/resend-link` (o recover-onboarding) para reenviar magic link.

### Paso 4 — Verificación global

```sql
-- Consulta 3 en polar-reconcile-queries.sql — debe ser 0
SELECT COUNT(*) FROM tenants
WHERE polar_subscription_id IS NOT NULL
  AND polar_subscription_status IN ('active', 'trialing')
  AND COALESCE(plan_type, 'free') = 'free';
```

### Paso 5 — Smoke test de un pago nuevo

Registro nuevo → plan de pago → Polar → volver al onboarding → plan activo sin intervención manual.

### Checklist rápido

```
[ ] Webhook Enabled + deliveries 200
[ ] Query 1 y 2 ejecutadas — lista de afectados
[ ] Redeliver subscription.active por cliente (o SQL manual)
[ ] Query 3 = 0 pendientes
[ ] Cliente de prueba nuevo: pago → plan activo automático
```
