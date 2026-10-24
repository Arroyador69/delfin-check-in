# Prompt para el otro agente (coordinación — no pisarse)

Copia/pega esto en el chat del **otro agente** en Cursor:

---

```
Repo: delfin-check-in. Trabaja en español. Hay OTRO agente en paralelo en la misma rama/trabajo de captación.

REPARTO (no sobreescribir):
- TÚ (agente panel/cron): eres dueño de src/app/superadmin/public-owner-leads/**,
  src/app/api/cron/public-owner-leads/**, src/lib/public-owner-leads/daily-run.ts,
  src/lib/public-owner-leads/send-tracked.ts (salvo subject/CTA si ya está sync),
  PR #216 merge/deploy, panel KPI 50 envíos / 20 altas, crons Vercel.
- EL OTRO (agente lista/envío CSV): es dueño de scripts/public-owner-leads/**,
  data/leads.csv, spain-urls.csv, import-csv-and-send.ts, harvest de webs propias ES.
  Plantilla: src/lib/public-owner-leads/template.ts y scripts/.../lib/template.ts
  deben quedar IDÉNTICAS (info MIR → CTA prueba gratis → redes → baja). Si tocas
  template, avisa y sincroniza ambos archivos.

OBJETIVOS:
- ≥50 emails outreach/día (hard cap reputación; no subir más).
- ≥20 altas nuevas/día en admin (landing /parte-viajeros/ + Polar + atribución).
- Mails NO spam: tono B2B, RD 933/2021, parte viajeros, prueba gratis sin tarjeta,
  List-Unsubscribe + /es/baja-outreach, sin OTAs/LinkedIn/IG scrape.
- CTA: https://delfincheckin.com/parte-viajeros/#empezar (+ UTM) — info MIR en el mail,
  botón "Registrarme gratis — sin tarjeta" al form de alta/onboarding.
- Tracking opens/clicks en Superadmin via email_tracking + pixel/click wrap.

HOY / REGLAS:
1) Cap 50/día. No reenvíes status=sent del mismo día.
2) OUTREACH_SIGNUP_URL=…/parte-viajeros/#empezar (con ?email= en envíos nuevos).
3) Undelivered Zoho: pegar en panel Captación → «Marcar undelivered» (API OAuth
   sin scopes / IMAP off). No reenviar bounced.
4) Cola mañana: URLs en public_owner_lead_sources (pending); el cron 09:00 las
   scrapea y envía solo.
5) Informe Telegram 11:00 Madrid con sent/opened/clicked/bounce/altas.
6) template.ts idéntica en src + scripts.
```

---

## Estado Agent-lista (este chat)

- Harvest legal → `scripts/public-owner-leads/data/leads.csv` (~48 emails).
- Envío one-shot: `npx tsx scripts/public-owner-leads/import-csv-and-send.ts --limit 50`
  (usa `.env.outreach.local` de `vercel env pull`, gitignored).
- Cap CLI scripts: 50/día.
