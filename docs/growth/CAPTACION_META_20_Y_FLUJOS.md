# Captación: meta 20 altas/día y flujos A / B / C

## Objetivo de negocio (duro)

- **≥ 20 propietarios/agencias nuevas al día** (`signed_up_today`).
- Oleadas de mail: **250×4** (09 / 15 / 18 / 20h) si altas &lt; 20 (tope día **1000**).
- **Tras cada envío: refill automático a ~1000 `queued`** (nunca dejar la cola a 0).
- Telegram tras cada oleada + cierre ~21h con acumulado del día vs meta 20.
- Nunca reenviar el mismo email ni 2 al mismo dominio.
- Solo **España** + alojamiento turístico / vacacional (dueños, **agencias gestoras**, hoteles, hostales).

Si a las 15:00 / 18:00 / 20:00 aún &lt; 20 altas → seguir descubriendo y enviando hasta el tope 1000.

---

## Por qué 8 emails en un dry-run NO significa “poca España”

El dry-run de Flujo C solo prueba **~47 semillas de agencias** (lista curada). No es un censo de las ~300 000 VUT.

- **300 000 viviendas ≠ 300 000 emails.** La mayoría solo está en Airbnb/Booking **sin web propia** ni email público. Solo podemos contactar webs con correo visible (legal, sin listas compradas).
- Volumen real = **oleadas diarias** (A semillas dueños + B OSM por coords costa/ciudades + C agencias) rotando ~100+ lugares. Cada día webs nuevas; en semanas → cientos/miles.
- Tope envío: 50+50+50/día hasta meta **20 altas** (no spam masivo del mismo dominio).

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
| **B** | OSM Overpass por pueblo | Cron (`A+B` default) |
| **C** | Semillas agencias + OSM/hostales-hoteles ampliados | Cron (`A+B+C`) |

Flag: `PUBLIC_OWNER_LEADS_FLOW=A+B+C` (default en cron).

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
| ~07:00 | `0 6 * * *` | **Prepare** — rellena cola ≥100, **no envía**; provincias distintas |
| ~09:00 | `0 8 * * *` | Oleada 50 (A+B+C), provincias del día bloque mañana |
| ~15:00 | `0 14 * * *` | Oleada 50 si altas &lt; 20; **otras provincias** |
| ~18:00 | `0 17 * * *` | Oleada 50 si altas &lt; 20; prioridad agencias; **otras provincias** |
| ~19:00 | `0 18 * * *` | Telegram informe captación |

La rotación de provincias es automática (`provinces-es.ts` + coords OSM por `waveOffset`).

---

## KPI panel

Superadmin → Captación: `altas hoy / 20`, `emails hoy / 1000`, opens, undelivered.
