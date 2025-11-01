# 🎯 Guía Completa CEO/Multi-tenant para Delfín Check-in

## 📋 Introducción

Esta guía aborda los tres pilares fundamentales para operar **Delfín Check-in** como CEO de un SaaS multitenant:

1. **SuperAdmin Dashboard** - Gestión de clientes/propietarios
2. **Manejo de Errores y Monitoreo** - Visibilidad operativa
3. **Gestión de Producción y Deploys** - Desarrollo seguro

---

# 🏢 PUNTO 1: SuperAdmin Dashboard

## 🔴 Problema Actual

Actualmente todos los usuarios (incluido tú) acceden al mismo dashboard `admin.delfincheckin.com`. No hay separación entre:
- Tu rol como CEO/owner de la plataforma
- El rol de propietarios (tenants) que usan el PMS

## 🎯 Solución Recomendada: **SuperAdmin Separado**

### Opción A: SuperAdmin Integrado (Recomendada - Escalable)

**Ventajas:**
✅ Rápido de implementar (1-2 días)  
✅ No requiere nuevo dominio/subdominio  
✅ Simple de mantener  
✅ **Escalable indefinidamente** - funciona con 5, 50 o 500 clientes
✅ Acceso rápido desde mismo dominio

**Desventajas:**
❌ Requiere control de acceso estricto (pero fácil de implementar)

**Implementación:**

```typescript
// Estructura de roles sugerida:
export type UserRole = 
  | 'superadmin'    // Tu rol - acceso total
  | 'owner'         // Propietarios - su tenant
  | 'admin'         // Personal del propietario
  | 'staff'         // Empleados básicos
```

### ¿Cómo implementarlo?

**1. Modificar tabla `tenant_users`:**
```sql
ALTER TABLE tenant_users 
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- Marcar tu usuario como superadmin
UPDATE tenant_users 
SET is_platform_admin = true 
WHERE email = 'tu-email@delfincheckin.com';
```

**2. Crear nueva sección "/superadmin" en admin:**
```
src/app/superadmin/
  ├── page.tsx              # Dashboard CEO
  ├── tenants/
  │   ├── page.tsx          # Lista de tenants
  │   ├── [tenantId]/
  │   │   ├── page.tsx      # Detalle tenant
  │   │   └── analytics.tsx # Métricas del tenant
  ├── analytics/
  │   ├── page.tsx          # KPIs globales
  │   └── revenue.tsx       # Ingresos
  ├── logs/
  │   └── page.tsx          # Logs centralizados
  └── settings/
      └── page.tsx          # Config plataforma
```

**3. Middleware de protección:**
```typescript
// src/middleware.ts
if (url.pathname.startsWith('/superadmin')) {
  // Verificar que usuario sea superadmin
  const user = await getUserFromToken(authToken);
  if (!user?.is_platform_admin) {
    return NextResponse.redirect('/'); // Acceso denegado
  }
}
```

### Funcionalidades del SuperAdmin Dashboard

**Dashboard Principal (/superadmin):**
```
┌─────────────────────────────────────────┐
│ 📊 KPIs Globales                        │
├─────────────────────────────────────────┤
│ Total Tenant Activos: 23                │
│ Reservas Hoy: 45                        │
│ Ingresos del Mes: €8,450                │
│ Usuarios Online: 12                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🚨 Alertas y Errores                    │
├─────────────────────────────────────────┤
│ ⚠️ Tenant #123: 3 errores hoy           │
│ ⚠️ Webhook Stripe falló (3min ago)     │
│ ✅ Todo funcionando normalmente         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📈 Actividad Reciente                   │
├─────────────────────────────────────────┤
│ Nuevo tenant registrado (5min ago)     │
│ Cancelación desde book.delfin...        │
│ Payout procesado: €890                  │
└─────────────────────────────────────────┘
```

**Gestión de Tenants (/superadmin/tenants):**
```
Tabla filtrable con:
- Nombre/Email del tenant
- Plan (Basic/Standard/Premium)
- Estado (Active/Trial/Suspended)
- Nº habitaciones usadas
- Última actividad
- Acciones:
  ├─ Ver detalles
  ├─ Cambiar plan
  ├─ Suspender cuenta
  ├─ Ver logs del tenant
  └─ Acceder como tenant (impersonate)
```

**Analytics (/superadmin/analytics):**
```
Métricas agrupadas:
- Crecimiento de tenants (gráfico)
- Distribución de planes
- Reservas por mes
- Ingresos por tenant
- Churn rate
- Métricas de uso (habitaciones, reservas, etc.)
```

### 🏢 Ejemplos Reales de SaaS que Usan SuperAdmin Integrado

**Multi-tenant SaaS consolidados** usan esta misma arquitectura:

- **Stripe Dashboard** → Tienen `superadmin` interno dentro mismo app
- **Vercel** → Panel CEO integrado con proyectos  
- **Notion** → Admin workspace dentro de mismo dominio
- **Shopify** → Partner dashboard en `admin.shopify.com` interno
- **Airtable** → Workspace admin compartido

**Ninguno de estos tiene subdominio separado** para sus paneles CEO, incluso con miles de clientes.

### Opción B: Subdominio Separado (Opcional - No recomendado)

**Solo si tienes razones específicas** como:
- Compliance/regulaciones que requieren separación absoluta
- Necesitas branding diferente para el panel CEO
- Equipo grande de ops que necesita URLs diferentes

**Desventajas:**
❌ Requiere gestión adicional de dominio/certs  
❌ Más complejidad de configuración  
❌ Mayor mantenimiento  

**Recomendación:** **NO HACER** esto a menos que tengas una razón de negocio clara.

---

# 🚨 PUNTO 2: Manejo de Errores y Monitoreo

## 🔴 Problema Actual

Actualmente los errores solo aparecen en:
- Console logs de Vercel (difícil de filtrar)
- No hay alertas automáticas
- No hay visibilidad por tenant
- No sabes qué falla hasta que un cliente se queja

## 🎯 Solución: **Sistema de Logging Tiers**

### Nivel 1: Logs Estructurados (Ya implementado parcialmente)

Tu código ya tiene buenos ejemplos:
```typescript
console.log('🎯 [WEBHOOK RESERVAS] ========== ENDPOINT LLAMADO ==========');
console.error('❌ [WEBHOOK RESERVAS] Error enviando emails:', {...});
```

**Mejorar con:**

```typescript
// src/lib/logger.ts
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export function createLogger(service: string, tenantId?: string) {
  return {
    info: (message: string, meta?: object) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service,
        tenant_id: tenantId,
        message,
        ...meta
      }));
    },
    error: (message: string, error: Error, meta?: object) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service,
        tenant_id: tenantId,
        message,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        ...meta
      }));
    },
    warn: (message: string, meta?: object) => {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        service,
        tenant_id: tenantId,
        message,
        ...meta
      }));
    }
  };
}
```

**Uso:**
```typescript
const logger = createLogger('payout-processor', tenantId);
logger.error('Stripe transfer failed', error, { 
  reservationId,
  amount 
});
```

### Nivel 2: Almacenamiento Centralizado (Recomendado para producción)

**Opción A: Logflare (Gratis para startups)**
- Integra con Vercel
- 30 días de retención gratis
- Dashboards en tiempo real
- Alertas por email

**Opción B: Sentry (Gratis tier)**
- 5,000 eventos/mes gratis
- Stack traces automáticos
- Alertas configurables
- Muy fácil de integrar

**Integración Sentry:**
```bash
npm install @sentry/nextjs
```

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% de requests
  beforeSend(event, hint) {
    // Enriquecer con tenant_id
    if (hint?.contexts?.tenantId) {
      event.tags = { 
        ...event.tags, 
        tenant_id: hint.contexts.tenantId 
      };
    }
    return event;
  }
});
```

**Capturar errores:**
```typescript
try {
  await processPayout();
} catch (error) {
  Sentry.captureException(error, {
    tags: { 
      service: 'payouts',
      tenant_id: tenantId 
    },
    extra: { reservationId, amount }
  });
  throw error;
}
```

### Nivel 3: Alertas Automáticas (Primordial)

**Opción A: Telegram Bot (Ya lo tienes)**
```typescript
// src/lib/alerts.ts
import { sendTelegramMessage } from './telegram';

export async function notifyError(
  tenantId: string,
  error: Error,
  context: Record<string, any>
) {
  const message = `
🚨 *Error Detectado*

*Tenant:* ${tenantId}
*Error:* ${error.message}
*Context:* ${JSON.stringify(context, null, 2)}
*Stack:* \`\`\`${error.stack?.substring(0, 500)}\`\`\`
  `;
  
  await sendTelegramMessage(
    process.env.SUPERADMIN_TELEGRAM_CHAT_ID!,
    message
  );
}
```

**Opción B: Email a tu cuenta**
```typescript
import { sendEmail } from './email';

export async function notifyError(
  tenantId: string,
  error: Error,
  context: Record<string, any>
) {
  await sendEmail({
    to: 'alberto@delfincheckin.com',
    subject: `🚨 Error en Delfín Check-in - Tenant: ${tenantId}`,
    html: `
      <h2>Error Detectado</h2>
      <p><strong>Tenant:</strong> ${tenantId}</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <pre>${JSON.stringify(context, null, 2)}</pre>
      <pre>${error.stack}</pre>
    `
  });
}
```

### Sistema de Alerta Tier System

```typescript
export async function handleError(
  error: Error,
  severity: 'low' | 'medium' | 'high',
  tenantId?: string,
  context?: Record<string, any>
) {
  const logger = createLogger('error-handler', tenantId);
  
  logger.error('Error detected', error, context);
  
  // Nivel 1: Log a Sentry (siempre)
  Sentry.captureException(error, {
    tags: { severity, tenant_id: tenantId },
    extra: context
  });
  
  // Nivel 2: Alertas según severidad
  if (severity === 'high') {
    // Crítico: Telegram + Email
    await notifyError(tenantId || 'unknown', error, context);
    await sendEmail(/*...*/);
  } else if (severity === 'medium') {
    // Medio: Solo Telegram
    await notifyError(tenantId || 'unknown', error, context);
  }
  // Low: Solo logs, no alertas
}
```

### Ejemplo Práctico

```typescript
// src/app/api/cron/process-payouts/route.ts
try {
  await processStripeTransfer(tenantId, amount);
  logger.info('Transfer successful', { amount, tenantId });
} catch (error) {
  // ERROR ALTO: Afecta pagos
  await handleError(error, 'high', tenantId, { 
    type: 'stripe_transfer',
    amount,
    reservationId 
  });
  throw error;
}
```

---

# 🚀 PUNTO 3: Gestión de Producción y Deploys

## 🔴 Problema Actual

Si implementas cambios:
1. Push a `main` → Deploy inmediato a producción
2. Si hay un bug → TODOS los clientes lo sienten
3. No hay ambiente de staging para probar
4. Difícil hacer rollback

## 🎯 Solución: **Multi-Environment Setup**

### Estrategia Recomendada: 2 Entornos

**Branch Strategy:**
```
main branch          → Producción (admin.delfincheckin.com)
development branch   → Staging (staging.delfincheckin.com)
```

**Setup:**

**1. Crear branch `development`:**
```bash
cd delfin-checkin
git checkout -b development
git push origin development
```

**2. Crear proyecto Vercel para Staging:**
- En Vercel Dashboard → Import Proyecto
- Conectar a branch `development`
- Deploy en: `delfin-checkin-staging.vercel.app`

**3. Configurar variables de entorno:**

```
Producción (main):
- NODE_ENV=production
- DATABASE_URL=<tu-neon-production>
- STRIPE_KEY_LIVE=<live-key>

Staging (development):
- NODE_ENV=staging
- DATABASE_URL=<tu-neon-staging>  ⚠️ Base de datos separada
- STRIPE_KEY_TEST=<test-key>
```

**4. Workflow de Desarrollo:**

```
┌─────────────────────────────────────┐
│ DESARROLLO LOCAL                    │
│ $ npm run dev                       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ PUSH A DEVELOPMENT BRANCH           │
│ $ git push origin development       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ DEPLOY AUTOMÁTICO A STAGING         │
│ staging.delfincheckin.com           │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ PRUEBAS EN STAGING                  │
│ - Test con datos reales             │
│ - Verificar que no rompe nada       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ MERGE A MAIN (Solo si todo OK)      │
│ $ git checkout main                 │
│ $ git merge development             │
│ $ git push origin main              │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ DEPLOY AUTOMÁTICO A PRODUCCIÓN      │
│ admin.delfincheckin.com             │
└─────────────────────────────────────┘
```

### Protecciones Adicionales

**Feature Flags (Para rollback rápido):**
```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  new_cancellation_form: {
    enabled: process.env.NEXT_PUBLIC_FEATURE_CANCEL_FORM === 'true',
    rollout_percentage: 50 // Gradual rollout
  },
  new_payout_system: {
    enabled: true,
    rollout_percentage: 100
  }
};

export function isFeatureEnabled(feature: string): boolean {
  const flag = FEATURES[feature as keyof typeof FEATURES];
  if (!flag) return false;
  
  // Rollout gradual
  const random = Math.random() * 100;
  return flag.enabled && random <= flag.rollout_percentage;
}
```

**Uso:**
```typescript
if (isFeatureEnabled('new_cancellation_form')) {
  // Nueva funcionalidad
  return <NewCancelForm />;
} else {
  // Funcionalidad antigua
  return <OldCancelForm />;
}
```

**Database Migrations Seguras:**
```sql
-- Siempre hacer migraciones reversibles
BEGIN;

-- Ejemplo: Añadir columna
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);

-- Si algo falla, rollback automático
COMMIT; -- o ROLLBACK si hay error
```

### CI/CD Pipeline Básico (Opcional futuro)

**GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: |
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

# 📊 Dashboard SuperAdmin - KPIs Clave

Cuando implementes el SuperAdmin, aquí tienes métricas importantes:

## Métricas de Negocio

```typescript
// src/app/superadmin/analytics/kpis.ts
export interface PlatformKPIs {
  // Tenants
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  churnedTenants: number;
  newTenantsThisMonth: number;
  
  // Reservas
  totalReservationsToday: number;
  totalReservationsThisMonth: number;
  averageReservationValue: number;
  cancelationRate: number;
  
  // Ingresos
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  averageRevenuePerTenant: number;
  commissionsThisMonth: number;
  
  // Salud del Sistema
  errorRate: number;
  apiLatency: number;
  uptime: number;
}
```

**Query SQL Ejemplo:**
```sql
SELECT 
  -- Total tenants
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as active_tenants,
  
  -- Reservas
  COUNT(DISTINCT dr.id) FILTER (WHERE dr.created_at::date = CURRENT_DATE) as reservations_today,
  
  -- Ingresos
  SUM(dr.subtotal * t.commission_rate) FILTER (
    WHERE dr.created_at >= date_trunc('month', CURRENT_DATE)
  ) as commissions_this_month
  
FROM tenants t
LEFT JOIN direct_reservations dr ON dr.tenant_id = t.id;
```

---

# 🎯 Plan de Implementación Recomendado

## Fase 1: Fundación (1 semana)

**Día 1-2: SuperAdmin Básico**
- [ ] Crear rol `superadmin` en database
- [ ] Nueva sección `/superadmin`
- [ ] Lista de tenants con filtros
- [ ] Proteger rutas con middleware

**Día 3-4: Logging Mejorado**
- [ ] Crear `logger.ts` estructurado
- [ ] Integrar Sentry
- [ ] Alertas por Telegram
- [ ] Testear con error simulado

**Día 5-7: Environment Setup**
- [ ] Crear branch `development`
- [ ] Setup staging en Vercel
- [ ] Migrar DB a Neon staging
- [ ] Configurar variables de entorno

## Fase 2: Operacional (1 semana)

**Día 8-10: Analytics Dashboard**
- [ ] KPIs básicos en SuperAdmin
- [ ] Gráficos de crecimiento
- [ ] Métricas por tenant

**Día 11-14: Testing y Documentación**
- [ ] Probar flujo completo staging→prod
- [ ] Documentar procesos
- [ ] Onboarding para ti mismo

---

# 🔧 Herramientas y Costos

## Stack Recomendado

| Herramienta | Propósito | Costo |
|-------------|-----------|-------|
| Vercel | Hosting (ya lo tienes) | Free tier suficiente |
| Neon Postgres | Production DB | $19/mes |
| Neon Postgres | Staging DB | Free tier |
| Sentry | Error tracking | Free (5K eventos/mes) |
| Telegram Bot | Alertas | Gratis |
| Logflare | Logs (opcional) | Free tier |

**Total Mensual: ~$19** (sin cambios a lo que ya pagas)

---

# ✅ Checklist de Go-Live

Antes de lanzar a producción:

- [ ] SuperAdmin implementado y testado
- [ ] Sentry configurado con alertas
- [ ] Staging environment funcionando
- [ ] Documentación de procesos internos
- [ ] Backup strategy definida
- [ ] Monitoreo de KPIs activo
- [ ] Plan de rollback documentado
- [ ] Contactos de emergencia configurados

---

# 📞 Siguiente Paso

¿Con cuál de los tres puntos quieres empezar? Te recomiendo:

**Opción A:** SuperAdmin Dashboard (más visible, impacto inmediato)  
**Opción B:** Sistema de alertas (más crítico para estabilidad)  
**Opción C:** Staging environment (más seguro para futuros deploys)

¿Cuál prefieres implementar primero?

