# Captación diaria: 100 mails · 20 altas · ≥5 pagos

Playbook reutilizable (Delfín Check-in y otros proyectos). Solo fuentes **open source / datos abiertos** + webs públicas con email visible. Sin listas compradas.

## KPIs (qué significa el panel)

| Métrica en UI | Significado |
|---------------|-------------|
| **Altas nuevas hoy 2/20** | Leads outreach que se dieron de alta hoy. Meta **20**. Si &lt;20 → oleada 15:00 (y 18:00). |
| **Emails outreach hoy** | Cold mails. Oleada = hasta **250**. Tope día = **1000** (250×4). |
| **Abiertos / Clicks** | Abrir / clic del cold mail (tracking). |
| **Undelivered** | Bounce Zoho → no reenviar nunca. |
| **Recámara 0 leads listos** | `status=queued`. Si es 0, la siguiente oleada **no puede enviar**. Objetivo recámara ≥**100**. |
| **Altas atribuidas** | Signups ligados a un lead outreach. |

Metas de negocio diarias:

1. **≥100 emails buenos enviados** (reales, VR / agencia / hotel ES).
2. **≥20 altas nuevas** al producto.
3. **≥5 pagos** (conversión a plan de pago; medir aparte en Polar/Stripe).

## Fuentes open source (España)

| Fuente | Licencia | Qué aporta |
|--------|----------|------------|
| [oeg-upm/CJCyL turismo rural CSV](https://github.com/oeg-upm/CJCyL/blob/master/data/1284211842462.csv) | Datos JCyL / mirror GitHub | Miles de casas rurales CyL con **Email** + **web** |
| [Datos abiertos Navarra – alojamientos](https://datosabiertos.navarra.es/dataset/alojamientos-inscritos-en-el-registro-de-turismo-de-navarra) | CC-BY 4.0 | Hoteles, rurales, campings, email+web |
| [Castilla-La Mancha alojamientos rurales CSV](https://datosabiertos.castillalamancha.es/) | Datos abiertos | Rurales CLM |
| Semillas A/C + OSM por provincia | — | Gestoras, hoteles, dueños |
| Web pública del negocio | — | Email en contacto (Flujo extract) |

**No usar:** scrapers de OTAs, listas compradas, repos de emails robados.

## Flujo automático (cron Europe/Madrid)

| Hora | Cron | Acción |
|------|------|--------|
| 07:00 | `public-owner-leads-prepare` | Rellena cola ≥**1000** · **no envía** |
| 09:00 | `public-owner-leads` | Envía hasta **250** → refill **1000** + Telegram |
| 15:00 | `public-owner-leads-afternoon` | Si altas &lt;20 → **250** → refill + Telegram |
| 18:00 | `public-owner-leads-evening` | Si altas &lt;20 → **250** → refill + Telegram |
| 20:00 | `public-owner-leads-night` | Si altas &lt;20 → **250** → refill + Telegram |
| 21:00 | `captacion-evening-report` | Telegram cierre del día vs meta 20 |
| 19:00 | `captacion-evening-report` | Telegram |

Rotación: `provinces-es.ts` + `waveOffset`. Refill: `refill-queue.ts` (opendata JCyL + extract).

## Cómo ejecutar a mano

```bash
cd delfin-check-in

# Catch-up: enviar cupo del día + rellenar cola a 150
npx tsx scripts/public-owner-leads/catchup-send-and-refill.ts --max 60

# Solo rellenar sin enviar
npx tsx scripts/public-owner-leads/import-opendata-queue.ts --limit 150

# Ver stock
npx tsx scripts/public-owner-leads/stats-today.ts
```

## Reglas duras

- 1 email y 1 dominio = 1 envío de por vida.
- España por **+34 / texto / lang=es**, no por TLD `.es`.
- Agencias multi-vivienda: plantilla prioridad.
- Undelivered → suppression.
- Onboarding 1-clic → redirect magic link.
- **Tras CADA envío del cron: rellenar cola hasta ~1000** (`refillQueuedStock`). Nunca dejar recámara a 0.
- Pacing ~0.8s entre mails (evitar 550 Zoho “Unusual sending activity”).
  Fuentes: datos abiertos JCyL (GitHub) + semillas + extract + OSM.

## Reutilizar en otros proyectos

1. Copiar `src/lib/public-owner-leads/` + crons + este MD.
2. Cambiar plantilla/copy y `OUTREACH_*` env.
3. Conectar SMTP + `email_tracking` + tabla leads.
4. Enganchar fuentes opendata del país/nicho.
5. KPI: `sent_today`, `signups_today`, `queued_ready`, `paid_today`.
