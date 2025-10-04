# Golden Beach Rentals

Web de alojamientos (Next.js 14, App Router, TypeScript, Tailwind) con:
- Hostal propio (6 habitaciones) → Stripe Checkout directo
- Afiliados (hoteles por habitación y apartamentos) → deeplink Expedia
- Actividades con mapa
- Vercel Postgres + Prisma
- SEO: next-seo + sitemap + robots

## Requisitos
- Cuenta Vercel + Vercel Postgres (plan free)
- Cuenta Stripe (modo test) para Checkout

## Variables de entorno
Copiar `.env.example` a `.env` (o configurar en Vercel):

```
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_DATABASE=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SITE_URL=https://tu-dominio.com
```

## Primeros pasos localmente
```bash
npm i
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```

## Deploy en Vercel
1. Crear proyecto en Vercel (importar este repo o subirlo)
2. Añadir Vercel Postgres → copiar variables POSTGRES_* al proyecto
3. Añadir STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET
4. Establecer `SITE_URL` al dominio
5. `npm run prisma:generate` y `npm run prisma:push` como comando de build opcional

## Webhooks de Stripe
- Endpoint: `/api/stripe/webhook`
- En Stripe CLI o dashboard, configura el webhook con el secreto en `STRIPE_WEBHOOK_SECRET`.

## Afiliados (Expedia)
- Edita los deeplinks en la BD (tabla `Lodging.affiliateLink`) o en `scripts/seed.ts`.
- `lib/affiliates.ts` añade UTMs automáticamente.

## Rutas
- `/` → puerta de entrada
- `/(public)/es` → Home española
- `/alojamientos` → Listado
- `/alojamientos/mi-hostal` → Ficha hostal + habitaciones + Stripe
- `/alojamientos/[slug]` → Fichas afiliadas (CTA a Expedia)
- `/actividades` y `/actividades/[slug]`
- `/sitemap.xml` y `/robots.txt`

## Notas
- Ajusta imágenes en `public/images/*`
- Colores: textos en negro para legibilidad
- Seguridad: valida inputs y revisa variables en entorno de producción
