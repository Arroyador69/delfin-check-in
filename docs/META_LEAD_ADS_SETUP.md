# Meta Lead Ads → onboarding automático (Delfín Check-in)

Conecta los **formularios instantáneos** de Instagram/Facebook con el mismo flujo que la landing gratuita: cuenta plan free (1 propiedad) + email con magic link a `/es/onboarding`.

## 1. En el Ads Manager (conjunto de anuncios)

- **Ubicación de la conversión:** `Formularios instantáneos` (solo eso; no uses “Sitio web y formularios…” si quieres el flujo directo).
- Crea o elige un **formulario instantáneo** con al menos el campo **Correo electrónico**.
- En la pantalla de gracias del formulario, indica que revisen **correo y spam** y que el enlace caduca en **72 h**.

## 2. Variables en Vercel (producción)

```env
META_WEBHOOK_VERIFY_TOKEN=elige_un_token_largo_aleatorio
META_APP_SECRET=app_secret_de_meta_developers
META_PAGE_ACCESS_TOKEN=token_de_pagina_con_leads_retrieval
META_GRAPH_API_VERSION=v21.0
```

### Cómo obtener los tokens

1. [developers.facebook.com](https://developers.facebook.com) → tu app → **Configuración** → copia **Identificador de la app** y **Clave secreta de la app** → `META_APP_SECRET`.
2. **Herramientas** → Graph API Explorer → genera un token de la **Página** de Facebook vinculada al Instagram con permisos:
   - `leads_retrieval`
   - `pages_manage_metadata`
   - `pages_read_engagement`
3. Convierte ese token en **long-lived** (token de página) y ponlo en `META_PAGE_ACCESS_TOKEN`.

## 3. Suscribir el webhook

URL de callback (producción):

```text
https://admin.delfincheckin.com/api/webhooks/meta-leads
```

En la app de Meta → **Webhooks** → objeto **Page** → suscribir campo **`leadgen`**.

- **Verify token:** el mismo valor que `META_WEBHOOK_VERIFY_TOKEN`.
- Meta hará un GET de verificación; debe responder con el `hub.challenge`.

## 4. Probar de punta a punta

1. En Meta, usa **Probar formulario** / envía un lead de prueba con tu email personal.
2. Revisa logs en Vercel: `[meta-leads]` sin errores.
3. Debe llegar el email de onboarding desde `noreply@delfincheckin.com`.
4. Abre el magic link y completa onboarding (plan free, 1 propiedad).

## 5. Tracking en base de datos

Los leads quedan en `waitlist` con:

- `source = meta_instant_form`
- `notes` con `meta_leadgen_id=…`, `form_id=…`, `campaign_id=…` si Meta los envía.

## 6. Creativo del anuncio

- Formato **vídeo** (Reels/Stories).
- CTA del anuncio que abre el formulario (no la web).
- Mensaje: prueba gratis **1 propiedad**, gestión legal de alquiler vacacional.

## Solución de problemas

| Síntoma | Qué revisar |
|--------|-------------|
| Meta no verifica el webhook | `META_WEBHOOK_VERIFY_TOKEN` y URL pública HTTPS |
| 401 Invalid signature | `META_APP_SECRET` correcto |
| fetch_failed | `META_PAGE_ACCESS_TOKEN` y permiso `leads_retrieval` |
| no_email | El formulario debe incluir campo email (estándar en formularios Meta) |
| Email no llega | SMTP / Zoho onboarding en Vercel |
