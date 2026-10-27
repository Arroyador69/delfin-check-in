# Captación: meta 20 altas/día y flujos A / B / C

## Objetivo de negocio (duro)

- **≥ 20 propietarios/agencias nuevas al día** (`signed_up_today`).
- Oleadas: **50 × 20** (~08:00–17:30 Madrid, cada 30 min) si altas &lt; 20 (tope día **1000**).
- Delay **1.8 s** entre mails (Zoho-safe).
- Telegram solo **3/día**: progreso **12:00** + **16:00** + cierre **21:00**.
- **Tras cada envío: refill automático a ~1000 `queued`** (nunca dejar la cola a 0).
- Si altas ≥ 20 → **stop** el resto del día; stock para mañana.
- Nunca reenviar el mismo email ni 2 al mismo dominio.
- Solo **España** + alojamiento turístico / vacacional (dueños, **agencias gestoras**, hoteles, hostales).

---

## Por qué 8 emails en un dry-run NO significa “poca España”

El dry-run de Flujo C solo prueba **~47 semillas de agencias** (lista curada). No es un censo de las ~300 000 VUT.

- **300 000 viviendas ≠ 300 000 emails.** La mayoría solo está en Airbnb/Booking **sin web propia** ni email público. Solo podemos contactar webs con correo visible (legal, sin listas compradas).
- Volumen real = **oleadas diarias** (A semillas dueños + B OSM por coords costa/ciudades + C agencias) rotando ~100+ lugares. Cada día webs nuevas; en semanas → cientos/miles.
- Tope envío: **50/oleada** hasta meta **20 altas** o hard cap **1000/día**.

## Por qué antes no llegábamos a 50 mails “de verdad”

1. Filtro demasiado estrecho (solo casas individuales; rechazaba hoteles/agencias).
2. Semillas gastadas + basura CSS / portales consumían cupo.
3. Flujo A (semillas) se agota; Flujo B (OSM `around:lat,lon`) encuentra webs nuevas; Overpass a veces timeout.
4. Faltaba un **Flujo C** orientado a **agencias** multi-vivienda (mayor LTV / prioridad de atención).

---

## ICP (quién sí / quién no)

### Sí (calidad)

| Perfil | Ejemplo | Notas |
|--------|---------|--------|
| Dueño casa rural / VUT / pazo / cortijo | `casax.es` | Flujo A/B |
| Camping / albergue propio | `camping*.es` | OSM B |
| **Agencia / gestora de alquiler vacacional** | gestión VUT, channel manager propietarios | **Flujo C** · prioridad si muchas viviendas |
| Hotel / hotel rural / hostal / pensión | habitaciones | Parte MIR también aplica |

### No

OTAs (Booking, Airbnb, Kayak…), directorios, federaciones, `*.gob.es`, software PMS puro, marketing, LatAm, basura CSS.

---

## Flujos técnicos

| Flujo | Origen | Estado |
|-------|--------|--------|
| **A** | Semillas `seed-spain-vacation-urls` + outbound | Cron |
| **B** | OSM Overpass por pueblo (coords rotativas ES) | Cron (`A+B` default) |
| **C** | Semillas agencias + OSM/hostales-hoteles ampliados | Cron (`A+B+C`) |
| **Open data** | JCyL + GVA (casas rurales) → email/web; webs sin mail → extract | Refill cada oleada |
| **Alerta** | Si cola &lt; 50 tras refill → **Telegram urgente** | Obligatorio |

Flag: `PUBLIC_OWNER_LEADS_FLOW=A+B+C` (default en cron).

**Norma dura:** nunca quedarse sin cola. Tras cada oleada refill a ≥1000. Si Overpass o un CSV fallan, las otras fuentes deben compensar. Ampliar CCAA en `discover-opendata-multi.ts`.

Normas B: `CAPTACION_FLUJO_B_POR_LUGARES.md`  
Normas C: `CAPTACION_FLUJO_C_AGENCIAS.md`

---

## Alta 1 clic → onboarding simple

1. CTA del mail → `/api/public/outreach-activate` (email firmado).
2. Crea tenant FREE + envía magic link onboarding.
3. Página de éxito: botón grande **Continuar onboarding** (enlace del mail) + email ya asociado.
4. En onboarding, pasos opcionales (horario, etc.) se pueden **saltar** / aplazar (ya existe defer).

Quien se dio de baja del *outreach* puede igual registrarse por el enlace; la baja solo para de enviar más cold mails.

---

## Crons (Europe/Madrid invierno CET)

| Hora Madrid | UTC | Ruta |
|-------------|-----|------|
| ~07:00 | `0 6 * * *` | **Prepare** — rellena cola ≥1000, **no envía** |
| 08:00–17:30 / 30′ | `0,30 7-16 * * *` | **Wave** — hasta 50 si altas &lt; 20 |
| ~21:00 | `0 20 * * *` | Telegram informe captación |

La rotación de provincias es automática (`provinces-es.ts` + slot OSM).

---

## KPI panel

Superadmin → Captación: `altas hoy / 20`, `emails hoy / 1000`, opens, undelivered, horario todo el día.

También: **intake** (web + email entrados, por fuente: opendata / osm / extract) para estadísticas futuras y auditoría.

## Copy outreach (confianza)

- Remitente: **Equipo Delfín Check-in** (imagen de empresa seria).
- Empieza **gratis sin tarjeta**; Plan Check-in (envío automático MIR) = **2€/mes + 2€/propiedad adicional**.
