# 🚀 MVP Sistema de Planes - Estado de Implementación

## ✅ Completado

### 1. Base de Datos
- ✅ Migración SQL creada (`database/migration-new-plans-system.sql`)
- ✅ Tabla `countries` con IVA por país (ES 21%, IT 22%, PT 23%)
- ✅ Tabla `plans` con configuración centralizada
- ✅ Tabla `subscriptions` para seguimiento de suscripciones
- ✅ Tablas `tenant_costs` y `tenant_revenues` para control de superadmin
- ✅ Campos nuevos en `tenants`: `subscription_price`, `vat_rate`, `extra_room_price`, etc.

### 2. Funciones Core
- ✅ `src/lib/vat.ts` - Cálculo automático de IVA por país
- ✅ `src/lib/plan-pricing.ts` - Cálculo de precios de planes
  - Plan Check-in: 2€ base + 2€ por cada unidad/propiedad adicional
  - Plan Pro: 29,99€ base (6 hab incluidas), luego 5€/hab adicional
- ✅ `src/lib/ads.ts` - Configuración de Google AdSense
- ✅ Actualizado `src/lib/tenant.ts` con nuevos tipos y validaciones

### 3. Componentes de Anuncios
- ✅ `src/components/AdsBanner.tsx` - Banner superior con Google AdSense
- ✅ `src/components/AdSidebar.tsx` - Anuncios en sidebar (300x250)
- ✅ `src/components/AdFooter.tsx` - Anuncios en footer
- ✅ Documentación completa en `GOOGLE_ADSENSE_SETUP.md`

### 4. Validaciones
- ✅ Función `canCreateUnit()` actualizada con nuevos límites:
  - Plan Gratis: máximo 2 habitaciones
  - Plan Check-in: ilimitado (con precio)
  - Plan Pro: 6 habitaciones base, luego precio adicional

## ⏳ Pendiente (Prioridad Alta)

### 1. Ejecutar Migración de BD
```sql
-- Ejecutar en Neon/Vercel Postgres:
-- database/migration-new-plans-system.sql
```

### 2. Sistema de Suscripciones Stripe
- [ ] Crear productos en Stripe:
  - Plan Check-in (2€/mes base)
  - Plan Pro (29,99€/mes)
  - Unidades/propiedades extra (2€/mes para checkin) + Habitaciones extra (5€/mes para pro, si aplica)
- [ ] `src/app/api/stripe/create-subscription/route.ts` - Crear suscripción
- [ ] `src/app/api/stripe/update-subscription/route.ts` - Actualizar suscripción (añadir habitaciones)
- [ ] `src/app/api/stripe/cancel-subscription/route.ts` - Cancelar suscripción
- [ ] `src/app/api/stripe/webhook-subscriptions/route.ts` - Webhook para eventos

### 3. Validación de Límites en Creación de Habitaciones
- [ ] Actualizar `src/app/api/rooms/create/route.ts` para validar límites
- [ ] Mostrar mensaje si necesita upgrade
- [ ] Calcular precio adicional si es plan checkin/pro

### 4. Cancelaciones con Retención Stripe
- [ ] `src/app/api/stripe/hold-payment/route.ts` - Retener pago hasta check-in
- [ ] `src/app/api/stripe/release-payment/route.ts` - Liberar si cancela antes
- [ ] Actualizar `src/app/api/reservations/cancel/route.ts`

### 5. Dashboard Superadmin - Gastos vs Ingresos
- [ ] `src/app/superadmin/tenant-costs/page.tsx` - Ver gastos por tenant
- [ ] Mostrar:
  - Gastos: Stripe fees, comisiones, reembolsos
  - Ingresos: Suscripciones, comisiones de reservas directas
  - Balance: Ingresos - Gastos
  - Alertas si gastos > ingresos

### 6. UI de Upgrade No Intrusivo
- [ ] `src/components/UpgradeBanner.tsx` - Banner discreto
- [ ] `src/components/FeatureLocked.tsx` - Badge en features bloqueadas
- [ ] Actualizar páginas principales para mostrar banners

### 7. Página de Planes
- [ ] `src/app/plans/page.tsx` - Página completa de planes
- [ ] Mostrar precios con IVA
- [ ] Calculadora para plan checkin (precio según habitaciones)
- [ ] Botones de upgrade

### 8. Migración de Datos Existentes
- [ ] Script para actualizar tenants actuales
- [ ] Asignar planes según `plan_id` actual:
  - `basic`/`standard` → `free`
  - `premium` → `checkin`
  - `enterprise` → `pro`

## 📋 Estructura de Planes Final

### Plan Gratis (free)
- **Precio**: 0€/mes
- **Límite**: 2 habitaciones máximo
- **Anuncios**: ✅ Sí (Google AdSense)
- **Check-in automático**: ❌ No
- **Reservas directas**: ✅ Sí (9% fee)

### Plan Check-in (checkin)
- **Precio base**: 2€/mes
- **Precio por unidad/propiedad adicional**: 2€/mes
- **Límite habitaciones**: Ilimitado (con precio)
- **Límite registros**: Ilimitado ✅
- **Anuncios**: ✅ Sí (Google AdSense)
- **Check-in automático**: ✅ Sí
- **Reservas directas**: ✅ Sí (9% fee)

### Plan Pro (pro)
- **Precio base**: 29,99€/mes
- **Habitaciones incluidas**: 6
- **Precio por hab adicional**: 5€/mes (después de 6)
- **Límite habitaciones**: Ilimitado (con precio después de 6)
- **Anuncios**: ❌ No
- **Check-in automático**: ✅ Sí
- **Reservas directas**: ✅ Sí (9% fee)

## 🔧 Variables de Entorno Necesarias

```bash
# Google AdSense (obtener de GOOGLE_ADSENSE_SETUP.md)
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_BANNER_ID=ca-pub-XXXXXXXXXX-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SIDEBAR_ID=ca-pub-XXXXXXXXXX-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_FOOTER_ID=ca-pub-XXXXXXXXXX-XXXXXXXXXX

# Stripe (ya configurado)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📝 Próximos Pasos Inmediatos

1. **Ejecutar migración SQL** en Neon/Vercel Postgres
2. **Configurar Google AdSense** (ver `GOOGLE_ADSENSE_SETUP.md`)
3. **Crear productos en Stripe** para los nuevos planes
4. **Implementar endpoints de suscripciones** Stripe
5. **Actualizar validaciones** en creación de habitaciones
6. **Crear dashboard** de gastos en superadmin
7. **Implementar UI** de upgrade

## 🎯 Objetivo MVP

Tener funcionando:
- ✅ Sistema de planes con límites correctos
- ✅ Anuncios Google AdSense (cuando esté aprobado)
- ✅ Suscripciones Stripe funcionando
- ✅ Validación de límites al crear habitaciones
- ✅ Dashboard superadmin para control de gastos
- ✅ UI de upgrade no intrusiva

## 📞 Notas Importantes

- **Google AdSense**: Puede tardar días/semanas en aprobarse. Mientras tanto, se mostrará banner de upgrade.
- **IVA**: Se calcula automáticamente según `country_code` del tenant.
- **Cancelaciones**: Retención de pago hasta día de check-in, luego se libera si cancela.
- **Gastos**: Se registran automáticamente en `tenant_costs` desde webhooks de Stripe.

