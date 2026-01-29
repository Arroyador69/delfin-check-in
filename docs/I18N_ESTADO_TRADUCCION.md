# Estado de la internacionalización (i18n) del panel de administración

Este documento resume qué está ya traducido y qué queda por traducir en el sistema Delfín Check-in (admin). Se usa **next-intl** v4 con App Router y rutas `[locale]/*`.

---

## ✅ YA TRADUCIDO (usa `useTranslations` y mensajes en `messages/*.json`)

### Páginas principales
| Ruta | Namespace | Notas |
|------|-----------|--------|
| `/[locale]` | `dashboard` | Dashboard principal |
| `/[locale]/reservations` | `reservations` | Reservas |
| `/[locale]/admin/direct-reservations` | `directReservations` | Reservas directas |
| `/[locale]/calendar` | `calendar` | Calendario |
| `/[locale]/calendar-sync` | `calendarSync` | Sincronización de calendarios |
| `/[locale]/guest-registrations-dashboard` | `guestRegistrations` | Registros de formularios (page, error.tsx, ExportButton) |
| `/[locale]/estado-envios-mir` | `estadoEnviosMir` | Estado envíos MIR |
| `/[locale]/admin/mir-comunicaciones` | `mirComunicaciones` | Admin MIR Comunicaciones |
| `/[locale]/cost-calculator` | `costCalculator` | Calculadora de costos |
| `/[locale]/facturas` | `facturas` | Facturas |
| `/[locale]/aeat` | `aeat` | Exportar AEAT |
| `/[locale]/audit` | `audit` | Bitácora |
| `/[locale]/offline-queue` | `offlineQueue` | Cola offline |
| `/[locale]/referrals` | `referrals` | Referidos |
| `/[locale]/checkout-rooms` | `checkoutRooms` | Contratar habitaciones / checkout |
| `/[locale]/plans` | `plans` | Elige tu plan |
| `/[locale]/upgrade-plan` | `upgradePlan` + `plans` | Mejorar plan |
| `/[locale]/partes` | `partes` | Generar XML del día |
| `/[locale]/messages` | `messages` | Mensajes automáticos / WhatsApp |
| `/[locale]/rooms` | `rooms` | Gestionar habitaciones |
| `/[locale]/onboarding` | `onboarding` | Flujo de onboarding (4 pasos) |
| `/[locale]/pricing` | `pricing` | Precios dinámicos (UI traducida; página redirige a `/`) |

### Configuración (`/[locale]/settings/*`)
| Ruta | Namespace | Notas |
|------|-----------|--------|
| `/[locale]/settings` (layout + página) | `settings` | Layout sidebar, página general (habitaciones) |
| `/[locale]/settings/account` | `settings` | Cuenta |
| `/[locale]/settings/checkin-instructions` | `settings.checkinInstructions` | Instrucciones check-in |
| `/[locale]/settings/empresa` | `settings.empresa` | Datos empresa |
| `/[locale]/settings/mir` | `settings.mir` | MIR |
| `/[locale]/settings/integrations` | `settings.integrations` | Integraciones / calendarios |
| `/[locale]/settings/billing` | `settings.billing` | Facturación y planes |
| `/[locale]/settings/microsite-payments` | `settings.micrositePayments` | Pagos microsite |
| `/[locale]/settings/payment-links` | `settings.paymentLinks` | Enlaces de pago |
| `/[locale]/settings/properties` | `settings.properties` | Propiedades |

### Componentes compartidos
| Componente | Namespace | Notas |
|------------|-----------|--------|
| `Footer.tsx` | `footer` | Pie de página global |
| `DynamicPriceCalculator.tsx` | `settings.billing.calculator` | Calculadora de precios (facturación) |
| `Navigation.tsx` | `navigation` | Menú / navegación |

### Idiomas con mensajes
- **es** (español)
- **en** (inglés)
- **it** (italiano)
- **fr** (francés)
- **pt** (portugués)

---

## ✅ ESTADO ACTUAL: TODO TRADUCIDO

No queda nada pendiente de traducción en el panel de administración. Lo que antes figuraba como pendiente ya está hecho:

| Antes pendiente | Estado actual |
|-----------------|---------------|
| **Onboarding** (`/[locale]/onboarding`) | ✅ Namespace `onboarding` en los 5 idiomas; página usa `useTranslations('onboarding')`. |
| **Pricing** (`/[locale]/pricing`) | ✅ Namespace `pricing` en los 5 idiomas; página usa `useTranslations('pricing')` y `useLocale()` para fechas. (La ruta sigue redirigiendo a `/`; si se quita el redirect, la UI ya está traducida.) |
| **Error del dashboard** (`guest-registrations-dashboard/error.tsx`) | ✅ Usa `useTranslations('guestRegistrations.errorPage')`; claves en los 5 JSON. |
| **ExportButton** (`guest-registrations-dashboard/ExportButton.tsx`) | ✅ Usa `useTranslations('guestRegistrations')` para `generatingXml` y `downloadXmlMir`. |

---

## Resumen numérico

| Categoría | Cantidad |
|-----------|----------|
| Páginas traducidas | 26+ (incl. onboarding, pricing, settings) |
| Componentes traducidos | 3 (Footer, DynamicPriceCalculator, Navigation) + error.tsx, ExportButton |
| Pendientes | **0** |
