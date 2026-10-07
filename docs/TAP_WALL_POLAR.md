# Delfín Tap Wall — Polar y dominios

## Dominios

| Host | Uso |
|------|-----|
| `tap.delfincheckin.com` | Panel propietario + contratar |
| `g.delfincheckin.com` | Página pública del huésped (chip NFC) |
| `admin.delfincheckin.com/{locale}/admin/tap-wall` | Info del producto en el menú admin (sin config NFC; contratar próximamente) |

## Productos en Polar (crear en dashboard)

1. **Tap Wall base** — suscripción mensual **10 €** (incluye 1 propiedad).  
   Copia el UUID del producto → `POLAR_PRODUCT_TAP_WALL_ID`
2. **Tap Wall propiedad extra** — suscripción mensual **2 €**.  
   Copia el UUID → `POLAR_PRODUCT_TAP_WALL_EXTRA_ID`  
   (Se añade una unidad de este producto por cada propiedad por encima de la primera.)

## Variables en Vercel (Production)

En el proyecto `delfin-check-in` → **Settings → Environment Variables** (Production):

| Variable | Valor |
|----------|--------|
| `POLAR_ACCESS_TOKEN` | El mismo `polar_pat_...` de organización (ya lo tienes si Check-in cobra bien) |
| `POLAR_WEBHOOK_SECRET` | El mismo secret del webhook actual |
| `POLAR_SERVER` | `production` |
| `POLAR_PRODUCT_TAP_WALL_ID` | UUID producto 10 €/mes |
| `POLAR_PRODUCT_TAP_WALL_EXTRA_ID` | UUID producto 2 €/mes |

Tras guardar: **Redeploy**.

Si quieres un token solo para Tap Wall, puedes crear otro Organization Access Token en Polar y sustituir `POLAR_ACCESS_TOKEN` (afecta a todos los checkouts). No hace falta un segundo token salvo que quieras rotar credenciales.

## Webhook

Sigue siendo: `https://admin.delfincheckin.com/api/webhook/polar`  
Los eventos Tap Wall llevan `metadata.source = "tap_wall"` y activan `tap_wall_accounts`.

## Base de datos

Ejecutar una vez en Neon:

```bash
# contenido de database/migration-tap-wall.sql
```

O deja que la app cree las tablas al primer uso (`ensureTapWallSchema`).

## Flujo

1. Propietario entra en admin → **Tap Wall (NFC)** → elige producto + dirección + acepta contrato → Polar.
2. Tras pagar, abre `https://tap.delfincheckin.com/app` y configura WiFi/instrucciones.
3. Tú programas el chip NFC con `https://g.delfincheckin.com/{public_code}`.
