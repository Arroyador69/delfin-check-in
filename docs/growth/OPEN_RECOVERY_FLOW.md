# Recovery opens — interés sin alta

## Problema

~800–1100 emails distintos **abrieron** outreach; FU A/B/C se **agotó** (`exhausted`) y ~700 siguen sin alta. Solo ~3 Plan Check-in activos. El cuello no es el cold: es **open → alta → pago**.

## Flujo

```
Cold → (open) → FU-B → exhausted
                    ↓ (cooldown 12h)
              Recovery R1 (objeción SES / “se te quedó a medias”)
                    ↓ (+5d sin alta)
              Recovery R2 (última ayuda + CTA directo)
                    ↓
              recovery_status = exhausted
```

Prioridad en oleada: **A click → B open → C silencio → recovery → cold** (cold rellena hasta HARD).

## Cupos

| Pieza | Valor |
|-------|--------|
| Recovery / día | 250 (dentro del FU_CAP 1000) |
| Toques | R1 + R2 |
| Backfill prepare | hasta 300/día (drip; 100 due ya) |
| Backfill oleada | +80 candidatos |

## Elegibilidad

- `status = sent`, `opened_at` not null, `signed_up_at` null
- `sequence_status = exhausted`
- `recovery_status` vacío
- sin opt-out / unsubscribe
- último toque ≥ 12 h

## Código

- `backfill-open-recovery.ts` · `ensure-recovery-schema.ts`
- `select-followups.ts` (due `fu_recovery`)
- plantillas R1/R2 en `template.ts`
- prepare cron programa backlog; oleadas envían

## Panel

SuperAdmin → Captación → bloque **Recovery opens**.
