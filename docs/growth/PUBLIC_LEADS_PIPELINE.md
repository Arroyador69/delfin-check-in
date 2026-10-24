# Pipeline legal de leads de propietarios (emails públicos)

**Objetivo:** captación B2B sostenible y RGPD/LSSI-aware a partir de emails **publicados voluntariamente** en la web del alojamiento. No es un sistema de spam masivo.

**v1:** CLI + CSV local (+ migración SQL opcional en Neon). Envío vía SMTP existente (Zoho/nodemailer) o documentación Resend/Brevo.

---

## 1. Fuentes permitidas (OK)

| Fuente | Criterio |
|--------|----------|
| Web propia del alojamiento | Email en `mailto:`, pie, página Contacto / Aviso legal |
| Formularios de contacto públicos | Solo si el email de destino está visible en HTML (no capturar envíos de terceros) |
| Directorios con email **visible** | Solo emails que cualquier visitante vea sin login ni bypass |

**Principio:** el propietario puso ese email para que le contacten por su negocio. Primer contacto B2B razonable, personalizado, con baja fácil.

## 2. Fuentes prohibidas (NO)

- Scrape de followers LinkedIn / Instagram / Facebook
- WhatsApp frío (números de huéspedes, OTAs, o listas compradas)
- Scrape de hosts Airbnb / Booking / Vrbo (ToS + datos no públicos como “email de contacto comercial”)
- Compra de bases de datos sin base legal / consentimiento
- Más de ~40 emails fríos/día sin personalización (riesgo reputación + LSSI)

El CLI rechaza estos hosts en código (`scripts/public-owner-leads/lib/blocked-hosts.ts`): Airbnb, Booking, Vrbo, LinkedIn, Instagram, Facebook, WhatsApp, X/Twitter, TikTok, etc.

## 3. Volumen y calidad sugeridos

| Límite | Valor |
|--------|--------|
| Envíos fríos/día | **50** (norma interna captación ES; hard cap 50) |
| Personalización | Mencionar dominio / nombre del alojamiento visto en la web |
| Cadencia | 1 email inicial; follow-up solo si no hay respuesta y no hay opt-out (máx. 1–2) |
| Rate limit scrape | ≥1–2 s entre requests; User-Agent identificable |
| Horario | Laborable EU; evitar fines de semana/madrugada |

## 4. Flujo v1

```
URLs CSV → extract (emails públicos) → leads.csv
       → queue (status=queued, sin opted_out)
       → send [--dry-run] (SMTP / documentado Resend|Brevo)
       → opt-out (link firmado o lista local)
```

Comandos (desde la raíz del repo):

```bash
# 1) Extraer emails públicos de URLs
npx tsx scripts/public-owner-leads/cli.ts extract --input scripts/public-owner-leads/sample-urls.csv

# 2) Ver cola
npx tsx scripts/public-owner-leads/cli.ts status

# 3) Preparar cola del día (máx. 50)
npx tsx scripts/public-owner-leads/cli.ts queue --limit 50

# 4) Vista previa / envío
npx tsx scripts/public-owner-leads/cli.ts send --dry-run --limit 50
npx tsx scripts/public-owner-leads/cli.ts send --limit 50   # requiere SMTP_*

# Producción: cron 0 7 * * * → /api/cron/public-owner-leads (~09:00 Madrid CEST)
# Panel: https://admin.delfincheckin.com/superadmin/public-owner-leads

# 5) Opt-out manual (también hay link en el email)
npx tsx scripts/public-owner-leads/cli.ts optout --email dueño@ejemplo.com
```

## 5. Datos almacenados

Campos mínimos: `email`, `domain`, `source_url`, `status`, `opted_out`, más timestamps y notas.

- **CSV local:** `scripts/public-owner-leads/data/leads.csv` (gitignored salvo sample)
- **Neon (opcional):** `database/migration-public-owner-leads.sql` → tabla `public_owner_leads`
- **Bajas:** scope `marketing` en `email_unsubscribes` + flag `opted_out` en leads; URL `/es/baja-outreach`

Estados sugeridos: `new` → `queued` → `sent` | `skipped` | `bounced` | `replied`.

## 6. Plantilla cold (legal)

Ver `scripts/public-owner-leads/lib/template.ts`.

Requisitos del mensaje:

1. Identificar remitente (Delfín Check-in) y propósito comercial B2B.
2. Indicar que el email se obtuvo de la **web pública** del alojamiento.
3. Oferta concreta: prueba gratis + onboarding MIR.
4. CTA claro a `https://delfincheckin.com` / panel.
5. **Link de baja** one-click + email de contacto.
6. Sin engaño, sin urgencia falsa, sin “has ganado un premio”.

## 7. Envío: SMTP actual vs Resend/Brevo

### Opción A — SMTP ya usado en el producto (recomendado v1)

Variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` / `SMTP_PASSWORD`, `SMTP_FROM` (o `SMTP_FROM_OUTREACH`).

El CLI `send` usa nodemailer igual que `src/lib/mailer.ts`.

### Opción B — Resend

```bash
# Pseudocódigo / curl de referencia (no automatizado en v1)
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"Alberto <hola@delfincheckin.com>","to":["dueño@alojamiento.es"],"subject":"...","html":"..."}'
```

### Opción C — Brevo (Sendinblue)

API `https://api.brevo.com/v3/smtp/email` con header `api-key: $BREVO_API_KEY`. Misma plantilla HTML; respetar límites diarios del plan y la cola local.

## 8. Checklist RGPD / LSSI (recordatorio operativo)

- [ ] Solo emails visibles en web pública del negocio
- [ ] Interés legítimo B2B documentado (o base legal revisada con asesor)
- [ ] Informar origen del email en el cuerpo
- [ ] Opt-out fácil y honorado **antes** del siguiente envío
- [ ] No recontactar opted-out / scope `marketing` o `all`
- [ ] Volumen bajo + personalización (no blast)
- [ ] Conservar registro de fuente (`source_url`) y fecha de envío
- [ ] No mezclar con emails de huéspedes (otro tratamiento)

> Esto **no** es asesoramiento legal. Revisar con abogado/DPO si escalas volumen o usas listas de terceros.

## 9. Qué no hace este prototipo

- No scrapea OTAs ni redes sociales
- No compra ni enriquece con datos personales sensibles
- No envía 50+/día por defecto
- No sustituye Meta Lead Ads / inbound (complementario; ver `docs/META_LEAD_ADS_SETUP.md`)
