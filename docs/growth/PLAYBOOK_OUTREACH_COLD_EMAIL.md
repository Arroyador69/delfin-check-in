# Playbook: cold email captación (alquiler vacacional) — referencia multi-proyecto

Documento vivo del flujo que estamos probando en **Delfín Check-in**.  
Cópialo a otros repos y adapta producto / país / SMTP. Objetivo interno: **máximo de altas** y, a continuación, **planes de pago** — sin spam ni quemar reputación.

---

## 1. Objetivo de negocio (interno)

| KPI / día | Meta | Notas |
|-----------|------|--------|
| Emails outreach | hasta **1000** | Solo si altas &lt; 20 |
| Altas nuevas | **≥ 20** | Si se cumple → **stop** envíos; cola para mañana |
| Pagos | **≥ 5** | Polar/Stripe (medir aparte) |
| Cola `queued` | **≥ 1000** | Tras cada cron |

Embudo: **cold → 1 clic alta FREE → onboarding sencillo → uso → plan de pago**.

---

## 2. Normas Zoho-safe (obligatorio)

Zoho Mail externos: **50–500 emails/hora** (dinámico). Bulk/burst **no** permitido.  
[Rates & limits](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html)

| Parámetro | Valor |
|-----------|--------|
| Por oleada | **50** |
| Oleadas / día | **20** (50×20 = 1000) |
| Delay SMTP | **1.8 s** |
| Ventana Madrid | **08:00–17:30** cada **30 min** |
| Prepare | ~**07:00** (solo cola, no envía) |
| Telegram | Solo **3/día**: **12:00** + **16:00** + cierre **21:00** |

Código: `src/lib/public-owner-leads/constants.ts`, `wave-schedule.ts`, `run-wave-cron.ts`.  
Cron Vercel: `public-owner-leads-wave` → `0,30 7-16 * * *` (UTC/CET).

---

## 3. Flujo técnico (Delfín)

```
Prepare 07:00 → cola ≥1000
    ↓
Oleadas 50 c/30 min (08:00–17:30)
    ↓ si altas ≥ 20 → stop (stock para mañana)
    ↓
CTA mail → /api/public/outreach-activate (1 clic)
    ↓
Tenant FREE + redirect onboarding (aunque falle SMTP)
    ↓
Onboarding sencillo → producto → upsell
```

| Pieza | Ruta / archivo |
|-------|----------------|
| Plantilla | `src/lib/public-owner-leads/template.ts` |
| Envío trackeado | `send-tracked.ts` + `send-smtp.ts` |
| Alta 1 clic | `activate-link.ts` + `api/public/outreach-activate` |
| Activación FREE | `signup-free-activate.ts` / `waitlist-activate-from-entry.ts` |
| Onboarding mail | `mailer.ts` `sendOnboardingEmail` (transaccional + reintentos) |
| Panel | Superadmin → Captación propietarios |
| Preview local | `scripts/public-owner-leads/send-template-preview.ts` |

### Crons (`vercel.json`)

- `public-owner-leads-prepare` — `0 6 * * *`
- `public-owner-leads-wave` — `0,30 7-16 * * *`
- `captacion-evening-report` — `0 20 * * *`
- `email-sequences` — reintenta onboarding fallidos + lifecycle

---

## 4. Plantilla del mail — copy & diseño (confianza + conversión)

### Qué NUNCA poner

- De dónde salió el email / “publicado en tu web”
- “Sin listas compradas” u origen del lead  
  → quema confianza ([mejores prácticas cold B2B](https://reply.io/write-better-cold-emails/): valor, 1 CTA, corto).

### Qué SÍ poner

1. **Dolor legal claro**: parte MIR / RD 933/2021 obligatorio.  
2. **Solución gratis**: registrarte y usarlo **gratis, sin tarjeta**.  
3. **Más que un parte**: limpiezas, reservas directas (menos comisiones Airbnb/Booking), panel móvil.  
4. **Un solo CTA grande**: “Regístrate gratis” / “Probar gratis ahora” → enlace 1 clic.  
5. **Vídeo 1 min** (thumbnail + link, no iframe).  
6. **Redes** con logos 24×24 iguales (IG, Facebook, TikTok, YouTube).  
7. **Baja** clara (List-Unsubscribe + enlace).

### Redes oficiales (Delfín)

| Red | URL |
|-----|-----|
| Instagram | https://www.instagram.com/delfincheckin/ |
| Facebook | https://www.facebook.com/profile.php?id=61586844961934 |
| TikTok | https://www.tiktok.com/@delfincheckin |
| YouTube | https://www.youtube.com/@delfincheckin |

Iconos: `public/email/social/*.png` (mismo tamaño).

### CTA técnico

- Preferir `buildOutreachActivateUrl(email)` (1 clic → alta FREE + onboarding).  
- Fallback landing solo si `OUTREACH_ONE_CLICK=0`.

---

## 5. Onboarding email “fallido”

Causa frecuente: Zoho **550 Unusual sending** (rate-limit) tratado como bounce.  
Fix: no suppress por rate-limit; onboarding **transaccional**; reintentos; cron retry.  
El 1 clic **siempre** debe dejar entrar al wizard aunque falle el SMTP.

Tras deploy: Superadmin → Tenants → **Reenviar onboarding**.

---

## 6. Fuentes de leads (legal)

Solo datos abiertos / email **público en web propia**.  
No OTAs, no listas compradas, no scrapers ilegales.  
Ver `CAPTACION_OBJETIVOS_100_20_5.md` y flujos A/B/C.

---

## 7. Cómo probar la plantilla

```bash
cd delfin-check-in
npx tsx scripts/public-owner-leads/send-template-preview.ts contacto@delfincheckin.com
```

Carga `.env.outreach.local` / `.env.local` (SMTP). No cuenta en el cupo diario.

---

## 8. Checklist al portar a otro proyecto

1. Copiar `src/lib/public-owner-leads/` + crons + este MD.  
2. Cambiar copy / marca / redes / vídeo.  
3. SMTP dedicado o reputación limpia; delay ≥ 1.5 s; oleadas ≤ 50.  
4. CTA 1 clic → alta + onboarding (no depender solo del segundo mail).  
5. Panel KPI: enviados / altas / cola / pagos.  
6. Telegram o Slack: pocos avisos/día (progreso + cierre).  
7. Suppression: marketing ≠ transaccional.

---

## 9. Estado avance (Delfín — rama captación)

| Ítem | Estado |
|------|--------|
| 50×20 Zoho-safe + cola 1000 | Hecho |
| 3 Telegram/día | Hecho |
| Fix onboarding rate-limit | Hecho |
| Plantilla sin origen + valor producto | Hecho |
| TikTok + logos 24×24 | Hecho |
| Playbook multi-proyecto (este MD) | Hecho |
| Merge `main` + deploy Vercel | Pendiente PR |

PR compare:  
https://github.com/Arroyador69/delfin-check-in/compare/main...fix/outreach-no-es-required-rebounce?expand=1

---

*Última actualización: flujo captación Delfín Check-in · uso interno / reutilizable.*
