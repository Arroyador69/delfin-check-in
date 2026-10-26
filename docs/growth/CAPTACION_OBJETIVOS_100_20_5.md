# Captación diaria: 1000 mails · 20 altas · ≥5 pagos (Zoho-safe)

Playbook reutilizable (Delfín Check-in y otros proyectos). Solo fuentes **open source / datos abiertos** + webs públicas con email visible. Sin listas compradas.

## Normas Zoho (obligatorio)

| Norma | Valor |
|-------|--------|
| Oleada | **50** mails (no 250: rate-limit / “Unusual sending activity”) |
| Tope día | **1000** (= 20 oleadas × 50) si altas &lt; 20 |
| Delay SMTP | **1.8 s** entre mails |
| Ventana | ~**08:00–17:30** Europe/Madrid, cada **30 min** |
| Telegram | Cada **150** mails acumulados + cierre ~21:00 |
| Meta altas | **20** → si se cumple, **stop** y cola para mañana |
| Cola | Siempre ≥ **1000** `queued` tras cada cron |

Zoho Mail externos: **50–500/h** dinámico. Bulk/burst no permitido. Por eso 50/oleada espaciadas, no 250 de golpe.

## KPIs (qué significa el panel)

| Métrica en UI | Significado |
|---------------|-------------|
| **Altas nuevas hoy 2/20** | Leads outreach que se dieron de alta hoy. Meta **20**. Si ≥20 → no más envíos hoy. |
| **Emails outreach hoy** | Cold mails. Oleada = hasta **50**. Tope día = **1000** (50×20). |
| **Abiertos / Clicks** | Abrir / clic del cold mail (tracking). |
| **Undelivered** | Bounce Zoho → no reenviar nunca. |
| **Recámara 0 leads listos** | `status=queued`. Si es 0, la siguiente oleada **no puede enviar**. Objetivo recámara ≥**1000**. |
| **Altas atribuidas** | Signups ligados a un lead outreach. |

Metas de negocio diarias:

1. **Hasta 1000 emails** buenos enviados (reales, VR / agencia / hotel ES), o menos si meta 20 altas antes.
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

| Hora (Madrid ≈) | Cron UTC (CET) | Acción |
|-----------------|----------------|--------|
| ~07:00 | `0 6 * * *` | `public-owner-leads-prepare` — cola ≥**1000** · **no envía** |
| 08:00–17:30 cada 30′ | `0,30 7-16 * * *` | `public-owner-leads-wave` — hasta **50** si altas &lt;20 · refill **1000** |
| ~21:00 | `0 20 * * *` | `captacion-evening-report` — Telegram cierre vs meta 20 |

Telegram progreso: al cruzar **150 / 300 / 450 / …** mails del día (no en cada oleada de 50).

Rotación: `provinces-es.ts` + slot OSM. Refill: `refill-queue.ts` (opendata JCyL + extract).

Código referencia:

- `src/lib/public-owner-leads/constants.ts`
- `src/lib/public-owner-leads/wave-schedule.ts`
- `src/lib/public-owner-leads/run-wave-cron.ts`
- `src/lib/public-owner-leads/daily-run.ts`

## Cómo ejecutar a mano

```bash
cd delfin-check-in

# Oleada 50 (force fuera de ventana)
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://admin.delfincheckin.com/api/cron/public-owner-leads-wave?force=1"

# Catch-up con pacing lento
npx tsx scripts/public-owner-leads/catchup-to-daily-cap.ts

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
- Pacing **~1.8 s** entre mails (evitar 550 Zoho “Unusual sending activity”).
- Si **altas ≥ 20**: no enviar más ese día; cola lista para mañana.

## Reutilizar en otros proyectos

1. Copiar `src/lib/public-owner-leads/` + crons + este MD.
2. Cambiar plantilla/copy y `OUTREACH_*` env.
3. Conectar SMTP + `email_tracking` + tabla leads.
4. Enganchar fuentes opendata del país/nicho.
5. KPI: `sent_today`, `signups_today`, `queued_ready`, `paid_today`.
6. Mantener **50/oleada · 1000/día · delay ≥1.5 s · Telegram cada 150** si usáis Zoho Mail.
