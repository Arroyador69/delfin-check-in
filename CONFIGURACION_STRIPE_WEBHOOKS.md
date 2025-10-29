# 🔧 Configuración de Webhooks de Stripe

## 📋 Problema Actual

El sistema tiene dos tipos de pagos que deben procesarse por webhooks diferentes:

1. **Pagos de Onboarding** (propietarios que se registran) → `/api/stripe/webhook`
2. **Pagos de Reservas Directas** (huéspedes que reservan) → `/api/stripe/webhook-direct-reservations`

Actualmente, Stripe puede estar enviando ambos tipos de eventos al mismo webhook, causando que los emails de reservas no se envíen.

## ✅ Solución: Configurar dos webhooks separados en Stripe

### Paso 1: Ir al Dashboard de Stripe

1. Ve a https://dashboard.stripe.com/
2. Ve a **Developers** → **Webhooks**

### Paso 2: Configurar Webhook para Onboarding

1. Haz clic en **"Add endpoint"**
2. **Endpoint URL**: `https://admin.delfincheckin.com/api/stripe/webhook`
3. **Description**: "Onboarding de propietarios - Delfín Check-in"
4. **Events to send**: Selecciona estos eventos:
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Haz clic en **"Add endpoint"**
6. **Copia el "Signing secret"** (empieza con `whsec_...`)
7. Este será tu `STRIPE_WEBHOOK_SECRET` en Vercel

### Paso 3: Configurar Webhook para Reservas Directas

1. Haz clic en **"Add endpoint"** de nuevo
2. **Endpoint URL**: `https://admin.delfincheckin.com/api/stripe/webhook-direct-reservations`
3. **Description**: "Reservas directas - Delfín Check-in"
4. **Events to send**: Selecciona estos eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Haz clic en **"Add endpoint"**
6. **Copia el "Signing secret"** (empieza con `whsec_...`)
7. Este será tu `STRIPE_WEBHOOK_DIRECT_RESERVATIONS_SECRET` en Vercel

### Paso 4: Configurar Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y agrega/verifica:

```bash
# Webhook para onboarding de propietarios
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook para reservas directas (IMPORTANTE: diferente al anterior)
STRIPE_WEBHOOK_DIRECT_RESERVATIONS_SECRET=whsec_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

⚠️ **IMPORTANTE**: Cada webhook tiene su propio secreto único. NO uses el mismo secreto para ambos.

## 🔍 Cómo Verificar que Funciona

### 1. Ver logs en Vercel

Después de hacer una reserva, revisa los logs en Vercel. Deberías ver:

**Webhook de Onboarding** (debe IGNORAR reservas directas):
```
🔔 Webhook recibido: payment_intent.succeeded
ℹ️ Pago de reserva directa detectado, ignorando en webhook de onboarding
```

**Webhook de Reservas Directas** (debe PROCESAR reservas):
```
🔔 [WEBHOOK RESERVAS DIRECTAS] Evento recibido: payment_intent.succeeded
✅ [WEBHOOK RESERVAS] Pago exitoso recibido: { paymentIntentId: 'pi_...', hasReservationId: true }
🔍 [WEBHOOK RESERVAS] Procesando reserva: 3
📧 [WEBHOOK RESERVAS] Enviando emails...
📧 [WEBHOOK RESERVAS] Resultado envío emails: { guestEmail: '✅ Enviado', ownerEmail: '✅ Enviado' }
```

### 2. Probar manualmente desde Stripe

1. Ve a **Developers** → **Webhooks**
2. Haz clic en el webhook de reservas directas
3. Haz clic en **"Send test webhook"**
4. Selecciona `payment_intent.succeeded`
5. Revisa los logs en Vercel para confirmar que se recibió

## ⚠️ Problemas Comunes

### Problema 1: "Webhook signature verification failed"

**Causa**: El secreto del webhook no coincide o está mal configurado.

**Solución**:
- Verifica que copiaste el secreto completo (empieza con `whsec_`)
- Asegúrate de usar el secreto correcto para cada webhook
- Verifica que las variables de entorno estén configuradas en Vercel

### Problema 2: No se reciben eventos en el webhook de reservas

**Causa**: El webhook no está configurado en Stripe o está desactivado.

**Solución**:
- Verifica en Stripe Dashboard que el webhook existe y está **Enabled**
- Verifica que la URL sea correcta: `https://admin.delfincheckin.com/api/stripe/webhook-direct-reservations`
- Verifica que los eventos `payment_intent.succeeded` estén seleccionados

### Problema 3: Los emails no se envían aunque el webhook funciona

**Causa**: Problema con la configuración SMTP o falta de variables.

**Solución**:
- Verifica que `SMTP_FROM_BOOKING` esté configurada en Vercel
- Revisa los logs para ver errores específicos de envío de email
- Verifica la configuración de Zoho Mail (ver `CONFIGURACION_EMAILS_ZOHO.md`)

### Problema 4: El webhook de onboarding procesa reservas directas

**Causa**: El webhook de onboarding no tiene la verificación de `reservation_id`.

**Solución**: 
- Ya está solucionado en el código (verifica que el webhook ignore si tiene `reservation_id`)
- Si sigue pasando, verifica que el código esté desplegado correctamente

## 📊 Checklist de Configuración

- [ ] Webhook de onboarding creado en Stripe
- [ ] Webhook de reservas directas creado en Stripe (separado)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado en Vercel
- [ ] `STRIPE_WEBHOOK_DIRECT_RESERVATIONS_SECRET` configurado en Vercel (diferente al anterior)
- [ ] Ambos webhooks están **Enabled** en Stripe
- [ ] Las URLs de los webhooks son correctas
- [ ] Los eventos correctos están seleccionados en cada webhook
- [ ] Deployment realizado en Vercel después de configurar las variables
- [ ] Prueba realizada: hacer una reserva y verificar logs

## 🔗 URLs de los Webhooks

**Onboarding:**
```
https://admin.delfincheckin.com/api/stripe/webhook
```

**Reservas Directas:**
```
https://admin.delfincheckin.com/api/stripe/webhook-direct-reservations
```

## 📝 Notas Importantes

1. **Cada webhook tiene su propio secreto único** - NO compartas el secreto entre webhooks
2. **Los eventos se envían a ambos webhooks** - El código debe decidir qué procesar
3. **El webhook de onboarding ignora reservas directas** usando `metadata.reservation_id`
4. **El webhook de reservas solo procesa si tiene `reservation_id`** en metadata
5. **Los pagos de reservas tienen `source: 'direct_reservation'`** en metadata para identificación adicional

## 🆘 Si Nada Funciona

1. Revisa los logs de Vercel con el filtro `[WEBHOOK RESERVAS]`
2. Verifica que ambos webhooks estén recibiendo eventos en Stripe Dashboard
3. Prueba enviar un webhook de prueba manualmente desde Stripe
4. Verifica que todas las variables de entorno estén configuradas
5. Asegúrate de que el código esté desplegado (verifica el commit en Vercel)

