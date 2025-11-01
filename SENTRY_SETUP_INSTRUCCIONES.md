# 🚨 Configuración de Sentry para Delfín Check-in

## ✅ Instalación Completada

Sentry ya está instalado en el proyecto. Solo necesitas **configurar tu cuenta**.

---

## 🔧 Pasos para Activar Sentry

### 1️⃣ Crear Cuenta en Sentry

1. Ve a: https://sentry.io/signup/
2. Crea cuenta (puedes usar tu email de Google)
3. Selecciona **Next.js** como plataforma

### 2️⃣ Crear Proyecto

1. En el dashboard de Sentry
2. Click en **"Create Project"**
3. Selecciona **"Next.js"**
4. Nombre del proyecto: `Delfín Check-in`
5. Click en **"Create Project"**

### 3️⃣ Obtener DSN

Después de crear el proyecto, Sentry te mostrará un **DSN** que parece:

```
https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Copia este DSN** - lo necesitarás en el siguiente paso.

### 4️⃣ Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Ve a **Settings** → **Environment Variables**
3. Añade esta variable:

```
Key: NEXT_PUBLIC_SENTRY_DSN
Value: https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

4. Click en **"Save"**

### 5️⃣ Redeploy

1. Ve a **Deployments** en Vercel
2. Click en **"Redeploy"** (o haz un push a main)
3. Espera ~2 minutos

### 6️⃣ Listo ✨

Sentry está activo. Ahora capturará errores automáticamente.

---

## 🎯 Cómo Funciona

### Captura Automática

Sentry captura **automáticamente**:
- ❌ Errores de JavaScript
- ❌ Errores de servidor (API routes)
- ❌ Errores de React
- ❌ Errores de Next.js

### Ver Errores

1. Ve a https://sentry.io
2. Selecciona tu proyecto
3. Ve a **"Issues"** para ver errores

---

## 🔧 Uso Manual (Opcional)

Si quieres capturar errores manualmente con contexto:

```typescript
import { captureErrorWithContext } from '@/lib/sentry-helper'

try {
  // Tu código
} catch (error) {
  captureErrorWithContext(error, {
    tenantId: 'xxx',
    userId: 'yyy',
    email: 'user@example.com',
    extra: { 
      reservationId: 123,
      action: 'process-payment' 
    }
  });
}
```

---

## 📊 Límite Gratuito

- ✅ **5,000 eventos/mes gratis**
- ⚠️ Suficiente para ~50-100 tenants activos
- 📈 Si creces, plan Team: $26/mes

---

## 🔗 Links Útiles

- Dashboard Sentry: https://sentry.io/organizations/
- Documentación: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

**Fecha de instalación:** $(date)

