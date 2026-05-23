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

## 3. Crear app y webhook en Meta for Developers

Desde [developers.facebook.com/tools](https://developers.facebook.com/tools/) arriba pulsa **Mis aplicaciones** (no basta con el Explorador de la API).

### 3.1 Crear la app (solo la primera vez)

1. **Mis aplicaciones** → **Crear aplicación**.
2. Tipo: **Otros** → **Negocio** (o “Administrar negocio”).
3. Nombre ej.: `Delfín Check-in Leads`.
4. En el panel de la app → **Añadir producto** → **Webhooks** → **Configurar**.

### 3.2 Configurar webhook de Page

1. En Webhooks, desplegable **Seleccionar producto** → **Page** (Página).
2. **Configurar** (o “Editar suscripción”):
   - **URL de devolución de llamada:** `https://admin.delfincheckin.com/api/webhooks/meta-leads`
   - **Token de verificación:** el mismo string que `META_WEBHOOK_VERIFY_TOKEN` en Vercel.
3. Pulsa **Verificar y guardar** (Meta hace GET con `hub.challenge`; el deploy y las variables deben estar ya activos).
4. En la fila **Page**, pulsa **Administrar** / suscribir campos → marca **`leadgen`** → Guardar.

### 3.3 Vincular la página Delfín Check In

1. En la misma app: **Webhooks** → sección **Suscripciones de la página** (o Graph API → suscribir página).
2. Elige la página **Delfín Check In**.
3. Alternativa: **Explorador de la API Graph** → POST `/{page-id}/subscribed_apps` con tu token de página.

### 3.4 Token de página (Graph API Explorer)

1. [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
2. **Aplicación de Meta:** tu app recién creada.
3. **Usuario o página:** **Delfín Check In** (token de **página**, no solo usuario).
4. Permisos: `leads_retrieval`, `pages_manage_metadata`, `pages_read_engagement`, `pages_show_list`.
5. **Generar token de acceso** → copiar a Vercel como `META_PAGE_ACCESS_TOKEN`.
6. **Depurador de identificadores de acceso** (misma página Herramientas): comprueba que no caduca en 1 hora; si caduca pronto, genera token long-lived de página.

### 3.5 Aceptar condiciones Lead Ads (obligatorio para publicar)

Si Ads Manager muestra error #1815089:

1. [business.facebook.com](https://business.facebook.com) → **Formularios de anuncios para clientes potenciales**.
2. O en Ads Manager, en el aviso rojo: **Lee y acepta las Condiciones…**
3. Página: **Delfín Check In** → **Aceptar**.

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
