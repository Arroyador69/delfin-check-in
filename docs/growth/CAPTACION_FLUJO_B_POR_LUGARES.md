# Flujo B (experimental): captación por lugares

**Estado:** prueba. Si encuentra emails buenos de dueños locales → se aplica al cron.  
**Flujo A (actual):** semillas fijas + outbound scrape (`seed-spain-vacation-urls` + cron).

Objetivo igual: **≥20 altas/día**, hasta **100 mails/día** (50 mañana + 50 tarde si altas &lt; 20), **nunca** reenviar el mismo email ni 2 al mismo dominio.

---

## 1. Idea

En lugar de depender solo de una lista fija de URLs, **buscar por lugar** en España:

1. Lista de pueblos / comarcas / provincias rurales.
2. Consulta **OpenStreetMap (Overpass)** en el área del lugar: nodos/ways `tourism=apartment|chalet|guest_house|camp_site|…` con tag `website` (y a veces `email`).
3. Filtrar portales/OTAs; quedarse con **web propia de UN alojamiento**.
4. Si OSM trae email válido → usarlo; si no, scrapear contacto de la web.
5. Enviar plantilla (mismo CTA 1 clic).

> Nota: Google/Bing/DuckDuckGo HTML suelen devolver captcha desde el servidor; OSM es la fuente estable del Flujo B.

---

## 2. Normas ICP (más estrictas que el flujo A “flojo”)

### Incluir solo si

- España: `+34` / provincia / `lang=es` / TLD `.es|.gal|.cat|.eus` (**.es no es obligatorio**).
- Es **un** alojamiento vacacional/rural: casa rural, pazo, finca, cortijo, villa, camping **propio**, albergue, hotel rural, VUT.
- Email público (`mailto`, JSON-LD, texto) **plausible**.
- Preferible: email cuyo **dominio = web** (`reservas@casax.es`) o Gmail/Hotmail del dueño en esa web.
- **1 email por dominio**; nunca reenviar.

### Excluir siempre

- OTAs y metabuscadores: Airbnb, Booking, Kayak, Rusticae, Tripadvisor, Vrbo…
- Directorios / portales: `casasruralesen*`, `campingsde*`, `alojamientorural.com`, federaciones, asociaciones, patronatos.
- Administración: `*.gob.es`, ayuntamientos, ministerios, RedIRIS.
- Agencias / software / marketing / spas / clínicas / seguros / inmobiliaria pura.
- LatAm y extranjeros: `.pe`, `.mx`, `.ar`, `.it`, `.fr` sin señal España fuerte.
- Basura CSS/WhatsApp-image / `st@e.*` / `formin@`…

### Calidad del sitio

- Host que sugiera alojamiento (`casa*`, `pazo*`, `cortijo*`, `finca*`, `rural*`, …) **y** contenido vacacional.
- Rechazar si el HTML habla de “directorio”, “más de 50 alojamientos”, “federación”, “compara precios”.

---

## 3. Lugares (semilla geográfica)

Rotar provincias y pueblos rurales típicos, p.ej.:

- Galicia: Ourense, Lugo, A Coruña, Pontevedra, Ribadeo, Allariz, Combarro…
- Asturias: Llanes, Cangas de Onís, Somiedo, Taramundi…
- Cantabria / País Vasco / Navarra / Aragón / Cataluña interior / Castilla / Extremadura / Andalucía rural (cortijos).

Cada run elige un **lote de lugares** (p.ej. 12) para no saturar buscadores ni el timeout.

---

## 4. Pipeline técnico

```
lugares → queries → URLs candidatas → filtro ICP → extract email → cola → send (cupo)
```

Script de prueba:

```bash
set -a && source .env.outreach.local && set +a
export NEXT_PUBLIC_APP_URL=https://admin.delfincheckin.com
npx tsx scripts/public-owner-leads/flow-b-by-place.ts --max-send 30
# dry:
npx tsx scripts/public-owner-leads/flow-b-by-place.ts --dry-run --max-places 8
```

Códigos:

- `src/lib/public-owner-leads/places-es.ts` — lugares + queries
- `src/lib/public-owner-leads/discover-by-place.ts` — búsqueda + parseo de URLs
- `scripts/public-owner-leads/flow-b-by-place.ts` — orquestación envío

Flag en Vercel / `.env`:

- `PUBLIC_OWNER_LEADS_FLOW=A` — solo semillas (default)
- `PUBLIC_OWNER_LEADS_FLOW=B` — solo descubrimiento por lugares (OSM)
- `PUBLIC_OWNER_LEADS_FLOW=A+B` — ambos (recomendado tras validar)

**Prueba 25/10/2026:** 12 lugares → 22 webs → **14 emails enviados** (casas/campings/albergues locales). Cumple umbral → listo para `A+B` en cron tras merge.

---

## 5. Criterio para pasar a cron (producción)

Tras una corrida manual:

| Métrica | Umbral mínimo |
|---------|----------------|
| URLs candidatas tras filtro ICP | ≥ 15 |
| Emails válidos (dominio web o free-mail dueño) | ≥ 10 |
| % basura / portales en enviados | **0 %** |
| Undelivered de esa oleada (24h) | bajo (revisar Zoho) |

Si cumple → unificar en `runDailyPublicOwnerLeads` (mañana/tarde) con `FLOW=B` o mixto A+B.  
Si no → ajustar lugares/queries/filtros; **no** mergear al cron.

---

## 6. Relación con Flujo A

| | Flujo A | Flujo B (este) |
|--|---------|----------------|
| Origen URLs | Semillas + outbound | OSM Overpass por pueblo/comarca |
| Riesgo portales | Medio (outbound) | Controlado por filtro + queries |
| Volumen | Depende de semillas gastadas | Escala con más lugares |
| Uso hoy | Cron 09:00 / 15:00 | **Solo prueba manual** hasta validar |

---

## 7. Legal / reputación

- Solo emails **públicos** en la web del alojamiento.
- Identificar bot (`DelfinCheckInPublicLeadsBot`).
- Rate-limit entre fetches.
- List-Unsubscribe + baja 1 clic.
- Tope 100/día; no reenvíos.
