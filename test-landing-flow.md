# 🧪 Test: Flujo de Contratación desde Landing Page

## 📋 Pasos para Verificar el Flujo Completo

### 1. **Verificar Configuración de Stripe**

```bash
# Verificar variables de entorno
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:20}..."
echo "STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:0:20}..."
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
```

### 2. **Probar Contratación desde Landing Page**

1. **Ir a**: `https://delfincheckin.com`
2. **Hacer clic en**: "Contratar" (cualquier plan)
3. **Verificar que se abre**: Modal de pago con Stripe
4. **Verificar que aparece**: Sección de términos y condiciones
5. **Verificar que aparece**: Información sobre email de onboarding

### 3. **Simular Pago de Prueba**

**Usar tarjetas de prueba de Stripe:**
- ✅ **Éxito**: `4242 4242 4242 4242`
- ❌ **Declinada**: `4000 0000 0000 0002`
- 🔐 **Autenticación**: `4000 0027 6000 3184`

**Datos de prueba:**
- **Fecha**: Cualquier fecha futura
- **CVC**: Cualquier 3 dígitos
- **Email**: `test@delfincheckin.com`

### 4. **Verificar Webhook de Stripe**

**Eventos que deben dispararse:**
1. `payment_intent.succeeded` - Pago exitoso
2. `invoice.payment_succeeded` - Factura pagada
3. **Acción**: Crear tenant y enviar email de onboarding

### 5. **Verificar Base de Datos**

```sql
-- Verificar que se creó el tenant
SELECT * FROM tenants WHERE email = 'test@delfincheckin.com';

-- Verificar que se creó el usuario
SELECT * FROM tenant_users WHERE email = 'test@delfincheckin.com';

-- Verificar token de onboarding
SELECT reset_token, reset_token_expires FROM tenant_users 
WHERE email = 'test@delfincheckin.com';
```

### 6. **Verificar Email de Onboarding**

**El email debe contener:**
- ✅ Contraseña temporal
- ✅ Link de onboarding
- ✅ Instrucciones de cambio de contraseña
- ✅ Acceso a admin.delfincheckin.com

### 7. **Verificar Acceso al Dashboard**

1. **Ir a**: `admin.delfincheckin.com`
2. **Usar**: Email y contraseña temporal
3. **Verificar**: Redirección a cambio de contraseña
4. **Cambiar**: Contraseña por una nueva
5. **Verificar**: Acceso al dashboard

## 🔍 Logs a Revisar

### Stripe Webhook Logs
```bash
# En los logs de Vercel/Next.js buscar:
- "🔔 Webhook recibido: payment_intent.succeeded"
- "✅ Pago exitoso (PI recibido)"
- "🔔 Webhook recibido: invoice.payment_succeeded"
- "📧 Email desde invoice: test@delfincheckin.com"
- "🏢 Creando tenant desde invoice"
- "✅ Tenant creado: [tenant-id]"
- "✅ Usuario creado: [user-id]"
- "🔗 Magic link de onboarding"
- "📧 Enviando email de onboarding"
```

### Base de Datos Logs
```bash
# Verificar creación de tenant y usuario
- Tenant creado con email correcto
- Usuario creado con role 'owner'
- Token de onboarding generado
- Email de onboarding enviado
```

## ⚠️ Problemas Comunes

### 1. **Webhook no se dispara**
- ✅ Verificar `STRIPE_WEBHOOK_SECRET`
- ✅ Verificar URL del webhook en Stripe Dashboard
- ✅ Verificar que está en modo test/live correcto

### 2. **Email no se envía**
- ✅ Verificar configuración SMTP/Brevo
- ✅ Verificar logs de email
- ✅ Verificar que el email no va a spam

### 3. **Tenant no se crea**
- ✅ Verificar conexión a base de datos
- ✅ Verificar logs de error en webhook
- ✅ Verificar que las tablas existen

## 🎯 Resultado Esperado

**Flujo completo exitoso:**
1. ✅ Usuario completa pago en landing page
2. ✅ Webhook recibe evento de Stripe
3. ✅ Se crea tenant en base de datos
4. ✅ Se crea usuario con contraseña temporal
5. ✅ Se envía email de onboarding
6. ✅ Usuario puede acceder al dashboard
7. ✅ Usuario cambia contraseña temporal

## 📞 Contacto para Soporte

Si hay problemas con el flujo:
- **Email**: contacto@delfincheckin.com
- **Logs**: Revisar Vercel Dashboard
- **Stripe**: Revisar Stripe Dashboard > Webhooks

