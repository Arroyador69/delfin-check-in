# Checklist producto / lanzamiento waitlist

Tareas acordadas (se va tachando al cerrar).

## Asistente (coste / alcance)

- [x] Límite mensual bajo por defecto (30); override con `ASSISTANT_MONTHLY_LIMIT` en Vercel.
- [x] Rate limit por minuto reducido (5).
- [x] `max_tokens` de respuesta reducido (220).
- [x] Prompt restringido a uso del producto + derivación de incidencias técnicas.
- [ ] Opcional: `NEXT_PUBLIC_SUPPORT_EMAIL` o `SUPPORT_CONTACT_EMAIL` para texto de contacto en el prompt.
- [ ] Futuro: límites distintos por `plan_type` / plan de pago (p. ej. add-on ~2 €).

## Sentry

- [ ] **Plan gratuito (Developer):** Sentry ofrece nivel free con cuotas (eventos/replays); revisar [sentry.io/pricing](https://sentry.io/pricing).
- [ ] Configurar `NEXT_PUBLIC_SENTRY_DSN` (y release si aplica) en Vercel.
- [ ] El proyecto ya incluye `@sentry/nextjs`; verificar que los avisos de build (`onRequestError`, etc.) no bloqueen el deploy.

## Soporte / tickets

- [ ] Módulo tickets (tenant en Ajustes + cola superadmin), historial permanente.
- [ ] Adjuntos: MVP en Postgres con límites estrictos o storage cuando haya ingresos.

## Neon / datos

- [ ] Migraciones aplicadas (`assistant_usage`, onboarding, etc.).
- [ ] Cuentas waitlist con plan free definido según landing.

## Legal y comunicación

- [ ] Páginas legales enlazadas y actualizadas si hace falta.
- [ ] Mensaje claro: asistente ≠ soporte para incidencias críticas (hasta exista ticket o email).

## Nota: carpeta `delfin-check-in-mac-mini`

No aplicar su `tsconfig` con `strict: false`: reduce errores de TypeScript **ocultándolos**, no corrigiendo código. El `next.config` y Sentry ya están alineados con el repo principal.
