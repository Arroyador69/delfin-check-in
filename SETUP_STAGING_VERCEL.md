# 🚀 Setup Staging en Vercel

## ✅ Estado Actual

**Repo GitHub:** https://github.com/Arroyador69/staging.delfincheckin.com ✅  
**Push completado:** Todo el código está en el repo ✅

---

## 📋 Siguiente Paso: Importar en Vercel

### 1️⃣ Importar Proyecto

1. Ir a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **"Add New..."** → **"Project"**
3. Click en **"Import Git Repository"**
4. Buscar `staging.delfincheckin.com` o el nombre de usuario `Arroyador69`
5. Seleccionar el repo **staging.delfincheckin.com**

---

### 2️⃣ Configurar Proyecto

**Project Name:** `staging-delfincheckin`  
**Framework Preset:** Next.js (auto-detected)  
**Root Directory:** `./` (default)

---

### 3️⃣ Variables de Entorno

Usar las mismas variables de producción, pero con valores de staging:

#### 🔑 Base de Datos

**Crear nueva base de datos en Neon:**

1. Ir a [Neon Console](https://console.neon.tech)
2. Crear nuevo **Branch** o **Project** → `delfin-staging`
3. Copiar `DATABASE_URL` de staging

```
DATABASE_URL=postgresql://... (Staging DB)
```

#### 🎨 Otras Variables

Copiar estas variables de producción y ajustar:

```env
# Base de datos (nueva para staging)
DATABASE_URL=postgresql://... (tu Staging DB de Neon)

# Node Environment
NODE_ENV=production  # Sí, 'production' para staging

# JWT
JWT_SECRET=tu_jwt_secret (mismo que producción)
JWT_REFRESH_SECRET=tu_jwt_refresh_secret (mismo que producción)

# Stripe (modo TEST)
STRIPE_SECRET_KEY=sk_test_... (Stripe Test Mode)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (crear nuevo webhook en Stripe para staging)

# Email (Zoho o tu proveedor)
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REFRESH_TOKEN=...
ZOHO_FROM_EMAIL=contacto@delfincheckin.com

# NextAuth
NEXTAUTH_URL=https://staging.delfincheckin.com
NEXTAUTH_SECRET=tu_nextauth_secret

# Sentry (opcional, mismo DSN o uno nuevo)
NEXT_PUBLIC_SENTRY_DSN=tu_sentry_dsn

# Ministerio (MIR) - Usar credenciales de TESTING si tienes
MIR_USERNAME=tu_usuario_test
MIR_PASSWORD=tu_password_test

# Telegram Bot (opcional para staging)
TELEGRAM_BOT_TOKEN=tu_token

# Otros
CHAT_ID=tu_chat_id
PORT=3000
```

---

### 4️⃣ Configurar Dominio

Después del primer deploy:

1. Ir a **Settings** → **Domains**
2. Click en **"Add Domain"**
3. Añadir: `staging.delfincheckin.com`
4. Seguir instrucciones de DNS

**DNS Record necesario:**

```
Type: CNAME
Name: staging
Value: cname.vercel-dns.com
```

---

### 5️⃣ Base de Datos Setup

Una vez configurado todo:

**Opción A: Script SQL limpio** (recomendado para staging)

```bash
# Ejecutar estos scripts en orden en Neon SQL Editor:

1. database/schema.sql
2. database/multi-tenant.sql
3. database/create-direct-reservations-system.sql
4. database/create-tenant-bank-accounts.sql
5. database/add-superadmin-support.sql  ← ¡IMPORTANTE!
```

**Opción B: Copiar schema de producción** (no recomendado)

Si quieres datos de prueba, puedes hacer un dump, pero **NO** copies datos reales de clientes.

---

### 6️⃣ SuperAdmin Setup

**Crear usuario SuperAdmin en staging:**

```sql
-- En Neon SQL Editor de staging
INSERT INTO tenant_users (
  email, 
  password_hash, 
  full_name, 
  role, 
  is_active, 
  is_platform_admin,
  tenant_id
)
SELECT email, password_hash, full_name, role, is_active, true, tenant_id
FROM tenants t
JOIN tenant_users tu ON tu.tenant_id = t.id
WHERE t.id = (SELECT id FROM tenants LIMIT 1)  -- Tu tenant ID
  AND tu.email = 'contacto@delfincheckin.com';

-- Verificar
SELECT * FROM tenant_users WHERE is_platform_admin = true;
```

---

### 7️⃣ Webhook de Stripe

**Crear nuevo webhook para staging:**

1. Ir a [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. URL: `https://staging.delfincheckin.com/api/stripe/webhook`
4. Seleccionar eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.created`
   - `account.updated`
5. Copiar **Signing secret** → añadir a `STRIPE_WEBHOOK_SECRET`

---

### 8️⃣ Primer Deploy

Después de todo lo anterior:

1. Vercel hará deploy automático
2. Ir a: https://staging.delfincheckin.com
3. Verificar que carga correctamente
4. Iniciar sesión con tu usuario SuperAdmin
5. Verificar SuperAdmin Dashboard

---

## ✅ Checklist Final

- [ ] Repo importado en Vercel
- [ ] Variables de entorno configuradas
- [ ] Nueva base de datos creada en Neon
- [ ] Scripts SQL ejecutados
- [ ] SuperAdmin creado
- [ ] Dominio configurado
- [ ] Webhook de Stripe configurado
- [ ] Primer deploy exitoso
- [ ] Login funcionando
- [ ] SuperAdmin Dashboard accesible

---

## 🧪 Testing Checklist

Después del setup, probar:

- [ ] Login como SuperAdmin
- [ ] Navegación SuperAdmin ↔ Tenant
- [ ] Crear nuevo tenant
- [ ] Crear reserva directa
- [ ] Sistema de cancelación
- [ ] Sistema de payouts
- [ ] Envío de emails
- [ ] Integración MIR (si aplica)

---

## 🚨 Importante

**NUNCA:**
- ❌ Usar base de datos de producción en staging
- ❌ Mezclar secrets de producción con staging
- ❌ Crear datos reales de clientes en staging
- ❌ Hacer payouts reales en staging

**SÍ:**
- ✅ Resetear la base de datos cuando necesites
- ✅ Usar Stripe Test Mode siempre
- ✅ Probar todas las features antes de producción
- ✅ Documentar problemas encontrados

---

## 📞 Soporte

Si algo falla, revisar:
1. Vercel logs: `vercel logs staging-delfincheckin`
2. Neon logs: SQL Editor → Query history
3. Stripe webhook logs: Dashboard → Webhooks

---

**Creado:** Nov 2025  
**Última actualización:** Nov 2025

