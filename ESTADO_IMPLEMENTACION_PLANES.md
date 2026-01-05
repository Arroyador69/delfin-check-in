# 📊 Estado de Implementación: Sistema de Planes Basado en Flags

## ✅ COMPLETADO

### 1. Base de Datos
- ✅ Migración SQL ejecutada
- ✅ Campos añadidos: `plan_type`, `ads_enabled`, `legal_module`, `country_code`, `onboarding_status`
- ✅ Tabla `waitlist` creada

### 2. Backend - Validaciones
- ✅ Funciones de validación en `src/lib/tenant.ts`
- ✅ Sistema de permisos en `src/lib/permissions.ts`
- ✅ Validación de módulo legal en endpoints:
  - `/api/guest-registrations`
  - `/api/ministerio/estado-envios`
  - `/api/public/guest-registration`
- ✅ Validación de límites de unidades en `/api/tenant/properties`
- ✅ **Excepción para superadmins** (siempre tienen acceso completo)

### 3. Frontend - Protección de Páginas
- ✅ Navegación filtra elementos según plan
- ✅ Página `/guest-registrations-dashboard` valida acceso
- ✅ Página `/admin/mir-comunicaciones` valida acceso
- ✅ Hook `useTenant` para obtener información del tenant
- ✅ **Excepción para superadmins** en frontend

### 4. Landing Page
- ✅ Formulario de waitlist añadido
- ✅ Integración con `/api/waitlist`
- ✅ Copy orientado a "PMS creado por propietarios, para propietarios"

### 5. Scripts
- ✅ Script para activar usuarios de waitlist (`scripts/activate-waitlist-users.ts`)

---

## ⚠️ PENDIENTE DE IMPLEMENTAR

### 1. Anuncios (ads_enabled)
**Estado:** Backend listo, falta frontend

**Qué falta:**
- Componente de anuncios para mostrar cuando `ads_enabled = true`
- Lógica para mostrar/ocultar anuncios según el plan
- Ubicaciones sugeridas: dashboard, páginas principales

**Archivos a crear/modificar:**
- `src/components/AdsBanner.tsx` (nuevo)
- Añadir en `src/app/page.tsx` y otras páginas principales

---

### 2. CTA cuando se alcanza límite de unidades
**Estado:** Validación backend lista, falta UI

**Qué falta:**
- Mostrar mensaje claro cuando se intenta crear más unidades de las permitidas
- CTA para "Actualizar a PRO" o "Crear otra cuenta"
- Mostrar límite actual vs usado en dashboard

**Archivos a modificar:**
- `src/app/settings/properties/page.tsx` - Añadir indicador de límite
- `src/app/page.tsx` - Mostrar banner si está cerca del límite
- Mejorar mensaje de error en `/api/tenant/properties` con CTA

---

### 3. Módulo legal según country_code
**Estado:** Validación backend lista, falta UI

**Qué falta:**
- Mostrar país configurado en settings
- Selector de país al activar módulo legal (FREE+LEGAL)
- Indicador visual del país en páginas del módulo legal
- Validación visual cuando se intenta usar módulo legal de otro país

**Archivos a modificar:**
- `src/app/settings/mir/page.tsx` - Añadir selector de país
- `src/app/guest-registrations-dashboard/page.tsx` - Mostrar país configurado
- `src/app/admin/mir-comunicaciones/page.tsx` - Mostrar país configurado

---

### 4. Onboarding Status
**Estado:** Campo añadido, no usado

**Qué falta:**
- Lógica de onboarding según `onboarding_status`
- Página de onboarding para nuevos usuarios
- Actualizar estado cuando completan pasos

**Archivos a crear/modificar:**
- `src/app/onboarding/page.tsx` - Mejorar con estados
- Middleware para redirigir según `onboarding_status`

---

### 5. Script de activación de waitlist
**Estado:** Script creado, falta implementar envío de emails

**Qué falta:**
- Integrar servicio de email (Resend, SendGrid, etc.)
- Template de email de activación
- Probar flujo completo

**Archivos a modificar:**
- `scripts/activate-waitlist-users.ts` - Implementar `sendActivationEmail()`

---

## 🎯 Prioridades Sugeridas

1. **Alta:** CTA cuando se alcanza límite de unidades (mejora UX inmediata)
2. **Media:** Anuncios (si se van a usar)
3. **Media:** Módulo legal según country_code (mejora claridad)
4. **Baja:** Onboarding status (si se va a usar)

---

## 📝 Notas

- Superadmins tienen acceso completo a todo (excepción implementada)
- Las validaciones backend son la fuente de verdad
- El frontend solo oculta/muestra UI, pero el backend siempre valida

