# Flujo C — Agencias de gestión vacacional + hoteles / hostales (España)

## Para qué

Los dueños 1–2 viviendas dan volumen lento. Las **agencias** que gestionan muchas VUTs / casas rurales / apartamentos turísticos:

1. Un solo contacto → muchas propiedades en Delfín.
2. Prioridad de atención comercial si el volumen es alto.
3. Mismo producto (parte MIR, check-in) para hoteles y hostales por habitaciones.

## Fuentes

1. **Semillas curadas** (`scripts/seed-spain-agency-urls.ts`): webs de gestoras vacacionales ES (no OTAs).
2. **OSM ampliado** (mismo runner B): `tourism=hotel`, `tourism=hostel`, `tourism=guest_house`, oficinas con tags vacacionales.
3. Extracción de email + filtro ICP **agencia/hotel** (ver `spain-vacation-filter.ts`).

## Copy del mail (agencias)

- Enfoque multi-vivienda / prioridad de atención.
- CTA igual: 1 clic → alta FREE + onboarding con email prefijado.

## Dedupe

Igual que A/B: 1 email y 1 dominio de por vida. No recontactar.
