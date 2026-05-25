# Polar — token, pagos e incidencias

## Error `401 invalid_token` en checkout

**Causa:** `POLAR_ACCESS_TOKEN` en Vercel caducado, revocado o de otro entorno (sandbox vs production).

**No es un bug de la app** si el log muestra `https://api.polar.sh/v1/checkouts/` y `invalid_token`.

### Arreglo inmediato (producción)

1. [polar.sh](https://polar.sh) → tu organización **producción** → **Settings** → **Access tokens**
2. Crear token nuevo con scope **`checkouts:write`** (y los que uses en webhooks)
3. Vercel → `POLAR_ACCESS_TOKEN` → **Edit** → pegar token nuevo (Production)
4. Confirmar `POLAR_SERVER` = `production`
5. **Redeploy** Production (sin redeploy el servidor sigue con el token viejo)

### Probar tras renovar

Sesión en admin → **Mejorar plan** → debe abrir checkout Polar (302), no JSON con error.

## Identificar quién intentó pagar (incidente 2026-05-25 ~06:02 UTC)

En Neon / SQL:

```sql
-- Si polar_last_upgrade_intent_at no existe, créala primero (ver abajo).
SELECT
  id,
  name,
  email,
  polar_last_upgrade_intent_at
FROM tenants
WHERE polar_last_upgrade_intent_at >= '2026-05-25 06:00:00+00'
  AND polar_last_upgrade_intent_at <  '2026-05-25 06:10:00+00'
ORDER BY polar_last_upgrade_intent_at DESC;
```

Tras merge/deploy de #116 también puedes usar `polar_last_checkout_context` (JSON con origen del clic).

`polar_last_checkout_context` indica origen, por ejemplo:

- `source: "onboarding"` → onboarding admin
- `source: "upgrade_plan"` → Mejorar plan en admin
- `source: "free_extra_units"` → plan básico, unidades extra

**Nota:** antes del fix de logging, solo existía `polar_last_upgrade_intent_at` en `/api/polar/upgrade`, no en `free-extra-units`.

## Rutas que crean checkout (todas usan el mismo token)

| Entrada | API |
|---------|-----|
| Onboarding (plan de pago) | `/api/polar/upgrade?source=onboarding` |
| Mejorar plan | `/api/polar/upgrade` |
| Plan básico + unidades extra | `/api/polar/free-extra-units` |
| Landing / subscribe público | `/api/polar/subscribe-redirect` → `/api/polar/checkout` |
| Añadir habitación (tenant rooms) | `/api/polar/free-extra-units` |

Un solo `POLAR_ACCESS_TOKEN` válido en Vercel arregla **todas** las rutas.
