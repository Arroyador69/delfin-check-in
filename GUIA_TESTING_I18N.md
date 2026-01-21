# 🧪 GUÍA COMPLETA DE TESTING - INTERNACIONALIZACIÓN (i18n)

## 📋 **RESUMEN DE LA IMPLEMENTACIÓN**

Se ha implementado soporte multiidioma (i18n) en el PMS usando `next-intl` con los siguientes idiomas:

- 🇪🇸 **Español** (ES) - idioma por defecto
- 🇬🇧 **Inglés** (EN) - primera prioridad
- 🇮🇹 **Italiano** (IT)
- 🇵🇹 **Portugués** (PT)
- 🇫🇷 **Francés** (FR)

---

## ⚙️ **PASO 0: MIGRACIÓN DE BASE DE DATOS (OBLIGATORIO)**

Antes de probar, **DEBES ejecutar** este SQL en Neon:

```sql
-- Abrir Neon Console -> Query Editor
-- Copiar y ejecutar el contenido de:
delfin-checkin/database/add-preferences-column.sql
```

Este script añade la columna `preferences` (JSONB) a la tabla `tenants` para guardar el idioma preferido del usuario.

**Verificación:**
```sql
-- Verificar que la columna existe:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' AND column_name = 'preferences';

-- Deberías ver:
-- column_name  | data_type
-- preferences  | jsonb
```

---

## 🎯 **COBERTURA DE TRADUCCIONES**

### ✅ **100% Traducidas:**
1. **Dashboard** (`/es/dashboard`, `/en/dashboard`, etc.)
   - KPIs (ocupación, ingresos, pendientes)
   - Botones de acción
   - Mensajes de bienvenida
   - Alertas y notificaciones

2. **Login** (`/admin-login`)
   - Labels del formulario
   - Placeholders
   - Botones
   - Mensajes de error/éxito
   - Links de recuperación de contraseña

3. **Navigation** (menú lateral)
   - Todos los items del menú
   - Iconos descriptivos
   - Tooltips

4. **Página 404** (`/es/not-found`, etc.)
   - Título y descripción
   - Botón de regreso

### 🟡 **70-80% Traducidas:**
5. **Reservations** (`/es/reservations`)
   - Título principal
   - Mensajes de carga/error
   - Estados (Confirmada, Cancelada, Completada)
   - Botones principales

6. **Calendar** (`/es/calendar`)
   - Título y subtítulo
   - Navegación básica

---

## 🧪 **TESTING PASO A PASO**

### **1. VERIFICAR DEPLOYMENT**

Antes de empezar, confirma que el último deployment en Vercel **pasó correctamente**:

```
✓ Build exitoso sin errores
✓ No hay warnings críticos de next-intl
✓ URL: https://admin.delfincheckin.com
```

---

### **2. TESTING DEL SELECTOR DE IDIOMA**

#### A) **Primera Carga (Detección Automática)**

1. **Configurar navegador en INGLÉS:**
   - Chrome: `chrome://settings/languages` → Mover English al top
   - Firefox: `about:preferences#general` → Language → English (primera)
   - Safari: Preferencias → Idiomas → English (primera)

2. **Abrir en modo incógnito:**
   ```
   https://admin.delfincheckin.com
   ```

3. **Verificar:**
   - ✅ URL redirige a `/en/admin-login`
   - ✅ Formulario en inglés ("Email", "Password", "Login")
   - ✅ Mensajes en inglés

4. **Repetir con navegador en ESPAÑOL:**
   - ✅ URL redirige a `/es/admin-login`
   - ✅ Todo en español

#### B) **Selector de Idioma en Navbar**

1. **Hacer login** con tu cuenta

2. **Localizar el selector:**
   - Debe estar en el header/navbar
   - Formato: dropdown con banderas o texto
   - Posición: esquina superior derecha

3. **Cambiar idioma:**
   - Click en selector
   - Seleccionar 🇬🇧 **English**
   - Esperar 1-2 segundos

4. **Verificar cambios:**
   - ✅ URL cambia de `/es/dashboard` → `/en/dashboard`
   - ✅ Título: "Dashboard" (en vez de "Panel de Control")
   - ✅ KPIs en inglés
   - ✅ Menú lateral en inglés

5. **Probar TODOS los idiomas:**
   - 🇮🇹 Italiano: `/it/dashboard`
   - 🇵🇹 Português: `/pt/dashboard`
   - 🇫🇷 Français: `/fr/dashboard`

---

### **3. TESTING DE PERSISTENCIA**

#### A) **Guardado en Base de Datos**

1. **Cambiar idioma a INGLÉS**
2. **Cerrar sesión** (Logout)
3. **Cerrar navegador completamente**
4. **Abrir navegador nuevo**
5. **Hacer login de nuevo**

**Verificar:**
- ✅ Dashboard carga directamente en `/en/dashboard`
- ✅ No vuelve a español
- ✅ Preferencia guardada

#### B) **Verificación en Base de Datos** (Opcional)

```sql
-- Ejecutar en Neon Query Editor:
SELECT 
  id,
  name,
  email,
  preferences->>'locale' as idioma_preferido
FROM tenants
WHERE email = 'TU_EMAIL@ejemplo.com';

-- Resultado esperado:
-- idioma_preferido | en
```

---

### **4. TESTING POR PÁGINA**

#### **A) DASHBOARD** (`/es/dashboard`)

| Elemento | Español | Inglés | Verificar |
|----------|---------|--------|-----------|
| Título | "Panel de Control" | "Dashboard" | ✅ |
| KPI Ocupación | "Ocupación" | "Occupancy" | ✅ |
| KPI Ingresos | "Ingresos del mes" | "Monthly income" | ✅ |
| KPI Pendientes | "Check-ins pendientes" | "Pending check-ins" | ✅ |
| Botón Ver Más | "Ver más" | "View more" | ✅ |

**Probar en:** ES, EN, IT, PT, FR

---

#### **B) LOGIN** (`/admin-login`)

| Elemento | Español | Inglés | Verificar |
|----------|---------|--------|-----------|
| Título | "Iniciar Sesión" | "Login" | ✅ |
| Campo Email | "Email" | "Email" | ✅ |
| Campo Password | "Contraseña" | "Password" | ✅ |
| Botón | "Iniciar sesión" | "Login" | ✅ |
| Error credenciales | "Email o contraseña incorrectos" | "Incorrect email or password" | ✅ |
| Link recuperar | "¿Olvidaste tu contraseña?" | "Forgot your password?" | ✅ |

**Probar:**
1. Login exitoso
2. Login con credenciales incorrectas
3. Mensajes de error en cada idioma

---

#### **C) NAVIGATION** (Menú lateral)

| Item | Español | Inglés | Italiano | Portugués | Francés |
|------|---------|--------|----------|-----------|---------|
| Dashboard | "Panel de Control" | "Dashboard" | "Dashboard" | "Painel" | "Tableau de bord" |
| Reservas | "Reservas" | "Reservations" | "Prenotazioni" | "Reservas" | "Réservations" |
| Calendario | "Calendario" | "Calendar" | "Calendario" | "Calendário" | "Calendrier" |
| Registros | "Registros de Huéspedes" | "Guest Registrations" | "Registrazioni Ospiti" | "Registos de Hóspedes" | "Enregistrements" |
| Configuración | "Configuración" | "Settings" | "Impostazioni" | "Configurações" | "Paramètres" |

**Probar:**
1. Click en cada item del menú
2. Verificar que la URL cambia correctamente
3. Verificar que el contenido carga en el idioma correcto

---

#### **D) RESERVATIONS** (`/es/reservations`)

| Elemento | Español | Inglés | Verificar |
|----------|---------|--------|-----------|
| Título | "Gestión de Reservas" | "Reservations" | ✅ |
| Subtítulo | "Crea y gestiona las reservas..." | "Create and manage..." | ✅ |
| Cargando | "Cargando reservas..." | "Loading reservations..." | ✅ |
| Error | "Error al cargar las reservas" | "Error loading reservations" | ✅ |
| Estado Confirmada | "Confirmada" | "Confirmed" | ✅ |
| Estado Cancelada | "Cancelada" | "Cancelled" | ✅ |
| Estado Completada | "Completada" | "Completed" | ✅ |

**Probar:**
1. Cargar página
2. Ver listado de reservas
3. Ver estados traducidos
4. Botón "Intentar de nuevo" en caso de error

---

#### **E) CALENDAR** (`/es/calendar`)

| Elemento | Español | Inglés | Verificar |
|----------|---------|--------|-----------|
| Título | "Calendario de Disponibilidad" | "Calendar" | ✅ |
| Subtítulo | "Visualiza y gestiona..." | "View and manage..." | ✅ |

---

#### **F) PÁGINA 404** (cualquier URL inválida)

1. **Ir a:** `https://admin.delfincheckin.com/es/pagina-inexistente`
2. **Verificar:**
   - ✅ Título: "Página No Encontrada"
   - ✅ Descripción en español
   - ✅ Botón "Volver al Inicio"

3. **Cambiar a inglés:** `/en/pagina-inexistente`
   - ✅ "Page Not Found"
   - ✅ "Back to Home"

---

### **5. TESTING DE NAVEGACIÓN ENTRE IDIOMAS**

#### **Flujo Completo:**

1. **Login en español** (`/es/admin-login`)
2. **Dashboard carga** en `/es/dashboard`
3. **Cambiar a inglés** usando selector
4. **Ir a Reservations** → URL debe ser `/en/reservations`
5. **Ir a Calendar** → URL debe ser `/en/calendar`
6. **Cambiar a italiano** → Todas las URLs actualizan a `/it/*`
7. **Logout y re-login** → Debe recordar italiano

**Verificar:**
- ✅ Todas las URLs mantienen el prefijo de idioma
- ✅ No hay mezcla de idiomas en una misma página
- ✅ Navegación fluida sin recargas completas

---

### **6. TESTING DE CASOS EDGE**

#### A) **URL Manual**

1. **Escribir en navegador:** `https://admin.delfincheckin.com/fr/dashboard`
2. **Sin estar autenticado**
   - ✅ Debe redirigir a `/fr/admin-login`

3. **Estando autenticado con idioma ES guardado**
   - ✅ Debe cargar en francés (URL prevalece)
   - ✅ Al navegar, se mantiene francés

#### B) **Locale Inválido**

1. **Escribir:** `https://admin.delfincheckin.com/de/dashboard` (alemán no soportado)
2. **Verificar:**
   - ✅ Muestra página 404 o redirige a español (comportamiento esperado)

#### C) **Sin Prefijo de Locale**

1. **Escribir:** `https://admin.delfincheckin.com/dashboard` (sin `/es/`)
2. **Verificar:**
   - ✅ Middleware redirige automáticamente a `/es/dashboard` o `/en/dashboard`
   - ✅ Según idioma del navegador

---

### **7. TESTING DE RENDIMIENTO**

1. **Cambiar idioma 10 veces seguidas**
   - ✅ No debe haber lag significativo (<500ms)
   - ✅ No se recarga la página completa

2. **Abrir 5 tabs con diferentes idiomas**
   - ✅ Cada tab mantiene su idioma
   - ✅ No interfieren entre sí

---

## ❌ **POSIBLES PROBLEMAS Y SOLUCIONES**

### **Problema 1: Selector de idioma no aparece**

**Causa:** Componente `LanguageSwitcher` no integrado en Navigation

**Solución:**
```typescript
// Verificar en src/components/Navigation.tsx:
import LanguageSwitcher from './LanguageSwitcher';

// Y dentro del JSX:
<LanguageSwitcher />
```

---

### **Problema 2: Textos no se traducen**

**Causa:** Clave de traducción no existe en JSON

**Diagnóstico:**
1. Abrir `messages/es.json`
2. Buscar la clave (ej: `"dashboard.title"`)
3. Si no existe, añadir:

```json
{
  "dashboard": {
    "title": "Panel de Control",
    ...
  }
}
```

4. Repetir para EN, IT, PT, FR

---

### **Problema 3: URL no cambia al seleccionar idioma**

**Causa:** `useRouter` no está funcionando correctamente

**Verificar:**
```typescript
// En LanguageSwitcher.tsx:
import { useRouter, usePathname } from 'next/navigation';

const changeLanguage = (newLocale: string) => {
  const newPath = `/${newLocale}${pathname.substring(3)}`;
  router.push(newPath);
};
```

---

### **Problema 4: Build falla en Vercel**

**Error común:** `Error occurred prerendering page "/_not-found"`

**Solución:** Verificar que `app/[locale]/not-found.tsx` tiene `'use client'` al inicio

---

### **Problema 5: Idioma no persiste después de logout**

**Causa:** API `/api/user/preferences` no funciona o SQL migration no ejecutada

**Diagnóstico:**
```sql
-- Verificar columna preferences existe:
SELECT * FROM tenants LIMIT 1;
-- Debe incluir columna 'preferences' (JSONB)
```

**Si no existe:** Ejecutar migration de PASO 0

---

## 📊 **CHECKLIST FINAL**

Marca cada item al completar el testing:

### **Configuración Inicial:**
- [ ] Migración SQL ejecutada en Neon
- [ ] Último deployment de Vercel exitoso
- [ ] No hay errores en consola del navegador

### **Funcionalidad Básica:**
- [ ] Selector de idioma visible en navbar
- [ ] 5 idiomas disponibles (ES, EN, IT, PT, FR)
- [ ] Cambio de idioma actualiza URL
- [ ] Cambio de idioma traduce UI inmediatamente

### **Persistencia:**
- [ ] Idioma se guarda en BD al cambiar
- [ ] Idioma persiste después de logout/login
- [ ] Idioma persiste en diferentes navegadores

### **Páginas Traducidas:**
- [ ] Dashboard: KPIs, botones, mensajes
- [ ] Login: formulario completo
- [ ] Navigation: menú lateral completo
- [ ] Reservations: título, estados, mensajes
- [ ] Calendar: título, subtítulo
- [ ] 404: página completa

### **Casos Edge:**
- [ ] URL manual con locale funciona
- [ ] Locale inválido manejado correctamente
- [ ] Detección automática por navegador
- [ ] Sin mezcla de idiomas en misma página

---

## 🎉 **RESULTADO ESPERADO**

Al completar todos los tests, deberías tener:

✅ **5 idiomas funcionando perfectamente**  
✅ **Persistencia de preferencias en BD**  
✅ **Navegación fluida entre idiomas**  
✅ **UI completamente traducida** (páginas principales)  
✅ **Sin errores en consola**  
✅ **Rendimiento óptimo**

---

## 📞 **SOPORTE**

Si encuentras algún problema durante el testing:

1. **Verificar consola del navegador** (F12 → Console)
2. **Verificar logs de Vercel** (Deployment → Logs)
3. **Verificar query en Neon** (preferences column)
4. **Revisar archivo de configuración:** `src/i18n/config.ts`

---

**Última actualización:** 21 Enero 2026  
**Versión:** 1.0  
**Idiomas soportados:** ES, EN, IT, PT, FR
