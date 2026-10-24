# Zoho Mail — Suppression de bounces / bajas / tenants inactivos

Lista global por email (`email_unsubscribes`) para **no contactar** en marketing, onboarding ni secuencias lifecycle. Recovery password **sí puede saltarse** suppression (`skipSuppression: true`).

## Motivos (`reason`)

| reason | Origen típico |
|--------|----------------|
| `bounce` | Carpeta Undelivered Zoho, CSV, SMTP 550 |
| `unsubscribe` | `/baja-emails`, outreach opt-out |
| `tenant_inactive` | Tenant `cancelled` / `suspended` / `inactive` / `churned` |
| `manual` | Import CSV u operación admin |

Columna `source` documenta el canal (`zoho_undelivered`, `smtp_bounce`, `csv_import`, `unsubscribe_web`, `tenant_status`, `tenant_scan`, …).

## Variables en Vercel (ya confirmadas)

Obligatorias para sync Zoho EU:

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `CRON_SECRET` (proteger crons)

Opcionales:

- `ZOHO_MAIL_API_URL` — default `https://mail.zoho.eu/api/accounts`
- `ZOHO_ACCOUNT_ID` — si no se puede listar cuentas
- `ZOHO_UNDELIVERED_FOLDER_ID` — si el nombre de carpeta no es “Undelivered”
- SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` / `SMTP_PASSWORD`) — envío + auto-suppress 550

Scopes OAuth recomendados en Zoho (EU):

- `ZohoMail.accounts.READ`
- `ZohoMail.folders.READ`
- `ZohoMail.messages.READ`

Token endpoint: `https://accounts.zoho.eu/oauth/v2/token`.

## Cómo funciona el sync Zoho

1. Refresh token → access token.
2. Resuelve `accountId` (`ZOHO_ACCOUNT_ID` o `GET /api/accounts`).
3. Busca carpeta Undelivered / Bounce (`ZOHO_UNDELIVERED_FOLDER_ID` o por nombre).
4. Lista mensajes (`GET .../messages/view?folderId=...`).
5. Extrae emails candidatos (excluye dominios propios) y hace upsert `reason=bounce`, `source=zoho_undelivered`.

Si la API no lista Undelivered (scope o carpeta), usar **import CSV** o confiar en **SMTP 550** auto-suppress.

El mismo cron escanea tenants inactivos y suprime el email del owner (`reason=tenant_inactive`).

## Cron

- Ruta: `POST` o `GET` `/api/cron/sync-zoho-bounces`
- Auth: `Authorization: Bearer $CRON_SECRET` (o sesión SuperAdmin)
- Schedule Vercel: diario `0 8 * * *` (ver `vercel.json`)
- Query opcional: `?limit=100`, `?skipTenants=1`

```bash
curl -X POST "https://admin.delfincheckin.com/api/cron/sync-zoho-bounces?limit=100" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Respuesta incluye `zoho` (messagesScanned, emailsFound, inserted, error/note) y `tenants` (scanned, suppressed).

## Import CSV (SuperAdmin)

Exportar Undelivered desde Zoho Mail UI → CSV →:

```bash
curl -X POST "https://admin.delfincheckin.com/api/superadmin/email-suppression/import-csv" \
  -H "Cookie: auth_token=..." \
  -H "Content-Type: application/json" \
  -d '{"csv":"email\nbad@example.com\nother@fail.com","reason":"bounce"}'
```

Multipart:

```bash
curl -X POST "https://admin.delfincheckin.com/api/superadmin/email-suppression/import-csv" \
  -H "Cookie: auth_token=..." \
  -F "file=@undelivered.csv" \
  -F "reason=bounce"
```

## Paths que respetan suppression

| Path | Comportamiento |
|------|----------------|
| `sendLifecycleEmail` (`email-sequences/send.ts`) | Bloquea + SMTP bounce → suppress |
| `sendOnboardingEmail` (`mailer.ts`) | Bloquea + SMTP bounce → suppress |
| `sendEmail` (`email.ts`) | Bloquea por defecto; SMTP 550 → suppress |
| `sendRecoveryEmail` | `skipSuppression: true` (transaccional) |
| Engine lifecycle (`isEmailUnsubscribed` → `isEmailSuppressed`) | Pausa enrollments |

## Auto-suppress SMTP

Si el envío falla con código/respuesta 550/551/553 o textos tipo “mailbox unavailable”, se inserta `reason=bounce`, `source=smtp_bounce`.

## Multitenant

La suppression es **global por email** (no por tenant): correcto para no contactar la misma dirección en ningún tenant.
