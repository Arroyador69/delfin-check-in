# Secuencia email: onboarding propietarios (prueba gratis + MIR)

**Clave:** `owner_trial_mir`  
**Audiencia:** solo leads con **opt-in** o **signup**.  
**No usar** para WhatsApp frío, scrape ni listas compradas.

| Producto | Significado |
|----------|-------------|
| Check-in | MIR / parte de viajeros |
| Tap Wall | Chip NFC WiFi (add-on) |
| App | Mando a distancia del panel |

UTM: `utm_source=email&utm_medium=onboarding&utm_campaign=trial_mir`

## Calendario

| Día | Plantilla | Contenido |
|-----|-----------|-----------|
| 0 | `trial_d0_welcome` | Bienvenida + CTA MIR 15 min |
| 1 | `trial_d1_checklist` | Checklist MIR + formulario huésped |
| 3 | `trial_d3_reminder` | Solo si onboarding incompleto |
| 5 | `trial_d5_tap_wall` | Tap Wall opcional (≠ Check-in) |
| 7 | `trial_d7_arrival_ok` | Valor MIR / próxima llegada OK |

## Activación

- Automática en signup free / waitlist activate → `maybeEnrollNewTenantInLifecycle`
- Manual: `POST /api/superadmin/email-sequences/enroll` con `{ "tenant_id": "..." }`
- Cron: `GET /api/cron/email-sequences` o superadmin `action=run|activate`

## Probar staging

```bash
curl -X POST "$APP_URL/api/superadmin/email-sequences/enroll" \
  -H "Cookie: auth_token=$TOKEN" -H "Content-Type: application/json" \
  -d '{"tenant_id":"TENANT_UUID"}'

curl -X POST "$APP_URL/api/superadmin/email-sequences" \
  -H "Cookie: auth_token=$TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"activate","maxSends":5}'
```

Acelerar: `UPDATE email_sequence_enrollments SET next_send_at = NOW() - interval '1 minute' WHERE ...`

```bash
npx vitest run tests/tenant-owner-onboarding-email-sequence.test.ts
```
