# Ejecución: ≥20 propietarios nuevos / día (Delfín Check-in)

**Objetivo de negocio:** que cada día entren **al menos 20 propietarios nuevos** que no conocían Delfín Check-in, entiendan el valor (parte de viajeros / MIR / RD 933/2021) y se registren (prueba gratis o plan Polar).

**KPI primario:** `signed_up_today ≥ 20` en Superadmin → Captación propietarios + altas landing/Polar.  
**KPI soporte outreach:** `sent_today = 50` emails fríos legales (tope anti-spam).  
**Realismo:** 50 mails fríos solos **no** dan 20 altas (conversión fría típica ≪ 5 %). Los 20/día salen del **embudo completo**: landing profesional + outreach + SEO/directorios + referidos + paid si hace falta.

---

## 0. Checklist previo (una vez)

### SQL (Neon) — obligatorio

```bash
# En el SQL editor de Neon, en este orden:
database/migration-public-owner-leads.sql
database/migration-public-owner-leads-tracking.sql
database/migrate-email-suppression.sql   # si aún no está
```

Verificar:

```sql
SELECT to_regclass('public.public_owner_leads');
SELECT to_regclass('public.public_owner_lead_sources');
SELECT COUNT(*) FROM public_owner_leads;
```

### Merge / deploy

1. Merge PR [#216](https://github.com/Arroyador69/delfin-check-in/pull/216) → `main` (admin + crons).
2. Confirmar en Vercel crons:
   - `GET /api/cron/sync-zoho-bounces` → `0 6 * * *` (UTC)
   - `GET /api/cron/public-owner-leads` → `0 7 * * *` (≈ **09:00 Madrid** en CEST)
3. Deploy landing `delfincheckin.com` con página `/parte-viajeros/` (destino de los mails).

### Env Vercel (app)

- `CRON_SECRET`, SMTP Zoho, `ZOHO_*` (bounces)
- `OUTREACH_SIGNUP_URL=https://delfincheckin.com/parte-viajeros/`
- `NEXT_PUBLIC_APP_URL=https://admin.delfincheckin.com`
- Polar ya cableado en `/planes/` → `api/polar/subscribe-redirect`

---

## 1. Embudo diario (números)

| Etapa | Meta / día | Notas |
|-------|------------|--------|
| URLs nuevas en cola | ≥ 40 | Webs propias ES (no OTAs) |
| Emails descubiertos | ≥ 30–50 | Solo públicos en HTML |
| Emails enviados (outreach) | **50** | Hard cap reputación |
| Opens | ≥ 15–25 % | Pixel + sync |
| Clicks CTA | ≥ 3–8 % | Link trackeado |
| **Altas nuevas** | **≥ 20** | Landing + Polar + waitlist; no solo cold |

Si a las **15:00** `signed_up_today < 20`: el cron de tarde envía otra oleada (emails **nunca contactados**; tope día 80).  
**Nunca** reenviar al mismo email. Copy siempre sencillo: ver `docs/COMUNICACION_CLIENTES.md`.  
Telegram: **11:00** y **19:00** Madrid.

Panel: `https://admin.delfincheckin.com/superadmin/public-owner-leads`

---

## 2. Prompts listos (copiar/pegar en Cursor)

### Prompt A — Ejecutar campaña del día (ops)

```
Repo: delfin-check-in. Trabaja en español.
1) Confirma que existen tablas public_owner_leads y public_owner_lead_sources.
2) En Superadmin o vía API POST /api/superadmin/public-owner-leads action=add_sources,
   carga N URLs de webs propias de alquiler vacacional en España (nunca Airbnb/Booking/LinkedIn/IG).
3) Dry-run: action=run_daily dryRun=true y resume resultado.
4) Si OK, run_daily dryRun=false (máx 50).
5) Abre /superadmin/public-owner-leads y dime: enviados hoy, opens, clicks, altas hoy vs meta 20.
```

### Prompt B — Landing venta partes MIR (delfincheckin.com)

```
Repo: delfincheckin.com (GitHub Pages). Colores marca #44c0ff / teal existentes.
Mejora o mantén /parte-viajeros/ como landing de CONVERSIÓN enfocada solo en:
parte de viajeros + envío MIR/SES Hospedajes + RD 933/2021 + prueba gratis + CTA Polar /planes/.
Estructura tipo competencia (Check-in Scan): problema → cómo funciona (3 pasos) → cumplimiento
→ planes Polar → formulario email → FAQ. Sin clutter de Tap Wall/reputación en el primer viewport.
Hero: marca dominante, 1 headline, 1 frase, CTAs. Tipografía expresiva, no Inter genérica.
Tras cambios, checklist móvil/desktop y enlace desde mails OUTREACH_SIGNUP_URL.
```

### Prompt C — Admin captación profesional

```
Repo: delfin-check-in. Revisa src/app/superadmin/public-owner-leads/page.tsx.
Haz la UI de superadmin clara y profesional: progreso vs 20 altas y vs 50 envíos,
badges de estado, empty states, banner si falta migración SQL, sin aspecto “hecho al azar”.
No rompas la API existente.
```

### Prompt D — SQL / tracking roto

```
Neon + delfin-check-in. El panel dice table_ready false o no cuentan opens/altas.
Verifica migraciones, columnas tracking_id/opened_at/clicked_at/signed_up_at,
y que signup-free llama markPublicOwnerLeadSignedUp. Propón SQL de reparación mínimo.
```

### Prompt E — Zoho no-spam / suppression

```
Antes de enviar outreach: confirma cron sync-zoho-bounces, isEmailSuppressed,
List-Unsubscribe y opt-out /es/baja-outreach. No envíes a bounced/unsubscribed/tenant_inactive.
```

---

## 3. Rutina diaria (humano o agente)

### 08:45–09:15 (Europa/Madrid)

1. Zoho cron ya corrió (~08:00 Madrid invierno / 07:00 CEST según UTC).
2. Cron `public-owner-leads` descubre + envía hasta 50.
3. Tú (o Prompt A): reponer **≥40 URLs** de webs propias si `sources.pending < 20`.

### Fuentes de URLs (legales)

- Google: `vivienda turística [ciudad] contacto` / `casa rural [provincia] aviso legal`
- Directorios municipales / asociaciones anfitriones (email visible)
- **Nunca:** scrape Airbnb, Booking, LinkedIn, IG, WhatsApp, listas compradas

### 18:00 — revisión KPI

En superadmin:

- `signed_up_today` ≥ 20?  
- Si no: cuántos clicks hubo → ¿landing frena? ¿asunto spam? ¿poca cola?

---

## 4. Repos GitHub / growth — qué sí y qué no para Delfín

Tu SaaS es **B2B propietarios alquiler vacacional España** (no developers). GitHub como imán PLG sirve poco; sí sirven playbooks y, con cuidado, scrapers de negocios locales.

### Útiles (estrategia / listas)

| Repo | Uso para Delfín |
|------|------------------|
| `Gingiris/gingiris-b2b-growth` | PLG vs SLG: prueba gratis = PLG; Polar Check-in/Pro = SLG. Orden: activar MIR en trial antes de upsell. |
| `thoughtlytics/saas-growth-playbook` | Plantillas adquisición/retención early-stage; alinear con secuencia `owner_trial_mir`. |
| `rafaecheve/Awesome-Growth-hacking` | Ideas outreach; **filtrar** lo ilegal (LinkedIn scrape agresivo). Solo webs públicas + baja fácil. |
| `ammohitchaprana/Awesome-SaaS-Directories` | Listar Delfín en directorios SaaS/travel **gratis** → backlinks + tráfico cualificado. Meta: 5 listados/semana. |

### Útiles con cuidado legal (datos)

| Repo | Uso |
|------|-----|
| `omkarcloud/google-maps-scraper` | Negocios locales (casas rurales, apartamentos) → **solo si** luego visitas la **web propia** y tomas email público (como nuestro pipeline). No usar teléfonos WhatsApp frío. |
| `Madi-S/Lead-Generation` | Playwright para webs; integrar filosofía de `public_owner_leads` (blocked hosts + opt-out). |

### No priorizar

- “Awesome” + README-as-landing en GitHub para atraer **devs**: tu comprador es el anfitrión, no el ingeniero.
- Side-project OSS como lead magnet principal: ROI bajo vs landing `/parte-viajeros/` + outreach legal.

### Prompt F — aplicar un repo de directorios

```
Usando ideas de Awesome-SaaS-Directories: dame 15 directorios relevantes para
"guest registration Spain" / "property management Spain" / "vacation rental software EU".
Para cada uno: URL submit, si es gratis, y el copy corto (50 palabras) de Delfín
centrado en parte de viajeros MIR / RD 933. No inventes URLs rotas; verifica.
```

---

## 5. Landing + Polar (mensaje de venta)

**Página de conversión de mails:** `https://delfincheckin.com/parte-viajeros/`

Debe transmitir (como Check-in Scan / mercado SES Hospedajes), con **marca Delfín**:

1. Problema: RD 933/2021, 24 h, multas, portal SES manual.
2. Solución: formulario huésped → parte → envío MIR desde el panel.
3. Prueba gratis 1 propiedad (email, sin tarjeta).
4. Planes de pago vía Polar (`/planes/` → subscribe-redirect).
5. Credibilidad: norma citada, pasos claros, diseño limpio (no “plantilla al azar”).

Home `index.html` puede seguir siendo producto completo; **el tráfico frío va a `/parte-viajeros/`**.

---

## 6. Comandos rápidos

```bash
# App
cd delfin-check-in
npm run leads:status
# o Superadmin → Captación → Dry-run / Ejecutar

# Tests
npx vitest run tests/tenant-public-owner-leads-daily.test.ts tests/mir-human-status.test.ts

# Cron manual (staging/prod con secreto)
curl -X GET "$APP_URL/api/cron/public-owner-leads?dryRun=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 7. Definición de “hecho” cada día

- [ ] ≥ 50 envíos outreach **o** cola vacía justificada  
- [ ] Opens/clicks visibles en panel  
- [ ] **≥ 20 altas nuevas** (signup free / Polar / waitlist activate)  
- [ ] Cero envíos a suppressed  
- [ ] URLs pending repuestas para mañana  

Si falla el KPI 20: no subir spam; arreglar conversión landing + canales warm.
