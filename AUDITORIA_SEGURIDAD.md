# 🔍 AUDITORÍA DE SEGURIDAD - DELFÍN CHECK-IN

**Fecha:** 8 de Octubre de 2025  
**Estado:** Crítico - Múltiples vulnerabilidades identificadas

---

## 🚨 VULNERABILIDADES CRÍTICAS IDENTIFICADAS

### 1. ❌ CONTRASEÑA HARDCODEADA EN CÓDIGO (`Cuaderno2314`)

**Severidad:** 🔴 CRÍTICA  
**Riesgo:** La contraseña está expuesta en texto plano en el código fuente

#### Ubicaciones encontradas (10 archivos):

1. **`src/middleware.ts:71`**
   ```typescript
   const storedPassword = process.env.ADMIN_PASSWORD || 'Cuaderno2314'
   ```

2. **`src/app/admin-login/page.tsx`** (3 ocurrencias)
   - Línea 17: `password: 'Cuaderno2314'`
   - Línea 25: `localStorage.getItem('admin_password') || 'Cuaderno2314'`
   - Línea 49: `localStorage.getItem('admin_password') || 'Cuaderno2314'`

3. **`src/app/settings/page.tsx:123`**
   ```typescript
   const currentStoredPassword = localStorage.getItem('admin_password') || 'Cuaderno2314'
   ```

4. **`src/app/reservations/page.tsx:92`**
   ```typescript
   const currentPassword = localStorage.getItem('admin_password') || 'Cuaderno2314'
   ```

5. **`src/app/aeat/page.tsx:40`**
   ```typescript
   const currentPassword = localStorage.getItem('admin_password') || 'Cuaderno2314'
   ```

6. **`src/components/AdminLayout.tsx:60`**
   ```typescript
   const currentPassword = localStorage.getItem('admin_password') || 'Cuaderno2314'
   ```

7. **`src/components/AuthGuard.tsx:27`**
   ```typescript
   if (authCookie && authCookie.includes('Cuaderno2314'))
   ```

8. **`src/app/api/auth/verify/route.ts:9`**
   ```typescript
   if (authToken && authToken.value === 'Cuaderno2314')
   ```

---

### 2. ❌ ALMACENAMIENTO DE CONTRASEÑAS EN LOCALSTORAGE

**Severidad:** 🔴 CRÍTICA  
**Riesgo:** Contraseñas accesibles desde el navegador mediante JavaScript (XSS)

#### Ubicaciones encontradas (9 ocurrencias en 5 archivos):

- `src/app/settings/page.tsx`
  - Línea 123: Lectura de `admin_password`
  - Línea 130: Escritura con `localStorage.setItem('admin_password', ...)`

- `src/app/reservations/page.tsx:92`
- `src/app/aeat/page.tsx:40`
- `src/app/admin-login/page.tsx` (2 ocurrencias)
- `src/components/AdminLayout.tsx:21` y `:60`

---

### 3. ❌ COMPARACIÓN DE CONTRASEÑAS EN TEXTO PLANO

**Severidad:** 🔴 CRÍTICA  
**Riesgo:** Sin hashing, las contraseñas viajan y se comparan como strings planos

#### Ejemplos:

**Backend:**
```typescript
// src/app/api/admin/login/route.ts:18
if (password === adminSecret)
```

**Frontend:**
```typescript
// src/app/admin-login/page.tsx:65
if (username === adminCredentials.username && password === adminCredentials.password)
```

---

### 4. ❌ DUPLICIDAD DE VARIABLES DE ENTORNO

**Severidad:** 🟡 MEDIA  
**Riesgo:** Confusión en la configuración, inconsistencias de seguridad

#### Variables encontradas:

- `ADMIN_PASSWORD` - Usado en `src/middleware.ts:71`
- `ADMIN_SECRET` - Usado en `src/app/api/admin/login/route.ts:8`

**Problema:** Dos variables para el mismo propósito creando confusión

---

### 5. ❌ TOKENS NO SEGUROS (Cookie = Password)

**Severidad:** 🔴 CRÍTICA  
**Riesgo:** El token de autenticación ES la contraseña en texto plano

#### Implementación actual insegura:

```typescript
// src/app/api/admin/login/route.ts:23
response.cookies.set('auth_token', adminSecret, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7, // 7 días
})
```

```typescript
// src/app/admin-login/page.tsx:72
document.cookie = `auth_token=${adminCredentials.password}; ...`
```

**Problema:** Si alguien intercepta la cookie, tiene la contraseña real

---

### 6. ❌ SIN RATE LIMITING EN ENDPOINTS

**Severidad:** 🟠 ALTA  
**Riesgo:** Vulnerable a ataques de fuerza bruta

#### Endpoints sin protección:

- `/api/admin/login` - Sin límite de intentos
- `/api/auth/verify` - Sin protección
- Todos los endpoints de autenticación

**Nota:** Solo hay configuración de rate limiting en `nginx.conf` (líneas 10 y 54), pero no implementada en la aplicación

---

### 7. ❌ SESIONES SIN TIMEOUT AUTOMÁTICO

**Severidad:** 🟠 ALTA  
**Riesgo:** Sesiones activas indefinidamente

#### Problemas identificados:

- Tokens con expiración de 7 días (demasiado largo)
- No hay refresh tokens
- No hay invalidación de sesión por inactividad
- No hay revocación de tokens

```typescript
// src/app/api/admin/login/route.ts:27
maxAge: 60 * 60 * 24 * 7, // 7 días - DEMASIADO LARGO
```

---

### 8. ❌ VALIDACIÓN DE SESIONES INSEGURA

**Severidad:** 🔴 CRÍTICA  
**Riesgo:** Verificación de autenticación en cliente (bypasseable)

#### Verificación del lado del cliente:

```typescript
// src/components/AuthGuard.tsx:27
if (authCookie && authCookie.includes('Cuaderno2314')) {
  setIsAuthenticated(true)
}
```

```typescript
// src/middleware.ts:73
if (!authToken || authToken !== storedPassword) {
  // Redirigir
}
```

**Problema:** La verificación se hace comparando strings, no validando tokens JWT firmados

---

## 📊 RESUMEN DE VULNERABILIDADES

| Tipo de Vulnerabilidad | Severidad | Archivos Afectados | Líneas de Código |
|------------------------|-----------|-------------------|------------------|
| Contraseña hardcodeada | 🔴 Crítica | 8 | 10 |
| localStorage de contraseñas | 🔴 Crítica | 5 | 9 |
| Comparación texto plano | 🔴 Crítica | 3 | 5 |
| Tokens inseguros | 🔴 Crítica | 4 | 14+ |
| Variables env duplicadas | 🟡 Media | 3 | 3 |
| Sin rate limiting | 🟠 Alta | Todos los endpoints API | N/A |
| Sin timeout de sesión | 🟠 Alta | Sistema completo | N/A |
| Validación insegura | 🔴 Crítica | 8 | 20+ |

---

## 🎯 ARCHIVOS QUE REQUIEREN MODIFICACIÓN

### Backend (10 archivos):
1. ✏️ `src/app/api/admin/login/route.ts`
2. ✏️ `src/app/api/auth/verify/route.ts`
3. ✏️ `src/app/api/auth/logout/route.ts`
4. ✏️ `src/app/api/admin/logout/route.ts`
5. ✏️ `src/middleware.ts`
6. ➕ `src/lib/auth.ts` (NUEVO - crear)
7. ➕ `src/lib/rate-limit.ts` (NUEVO - crear)

### Frontend (8 archivos):
8. ✏️ `src/app/admin-login/page.tsx`
9. ✏️ `src/app/settings/page.tsx`
10. ✏️ `src/app/reservations/page.tsx`
11. ✏️ `src/app/aeat/page.tsx`
12. ✏️ `src/app/page.tsx`
13. ✏️ `src/components/AdminLayout.tsx`
14. ✏️ `src/components/AuthGuard.tsx`
15. ✏️ `src/app/cost-calculator/page.tsx`

### Configuración (3 archivos):
16. ✏️ `env.example`
17. ✏️ `env.example.template`
18. ✏️ `package.json` (agregar dependencias)

---

## 🔧 DEPENDENCIAS NECESARIAS

```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "@types/bcryptjs": "^2.4.6",
  "@types/jsonwebtoken": "^9.0.5"
}
```

---

## 📋 PLAN DE ACCIÓN INMEDIATO

### Fase 1: Infraestructura (Pasos 2-5)
- ✅ Instalar bcrypt, jsonwebtoken
- ✅ Crear `/src/lib/auth.ts` con utilidades
- ✅ Crear `/src/lib/rate-limit.ts` para protección
- ✅ Generar hash bcrypt de contraseña
- ✅ Unificar a solo `ADMIN_SECRET_HASH` y `JWT_SECRET`

### Fase 2: Backend (Pasos 6-9)
- ✅ Actualizar `/api/admin/login` - bcrypt + JWT
- ✅ Implementar rate limiting (5 intentos/15min)
- ✅ Actualizar middleware para validar JWT
- ✅ Tokens con expiración de 2 horas + refresh token

### Fase 3: Frontend (Pasos 10-12)
- ✅ Eliminar TODO uso de localStorage
- ✅ Actualizar login para usar JWT
- ✅ Actualizar todas las páginas protegidas
- ✅ Remover todas las referencias a 'Cuaderno2314'

### Fase 4: Testing y Docs (Pasos 13-15)
- ✅ Actualizar archivos .env
- ✅ Testing completo del sistema
- ✅ Documentación de migración

---

## ⚠️ IMPACTO DE LA MIGRACIÓN

### Cambios Breaking:
1. Las sesiones actuales se invalidarán
2. Cambio en variables de entorno requerido
3. Nuevo flujo de autenticación
4. Usuarios deberán volver a hacer login

### Compatibilidad:
- ❌ Las cookies actuales NO funcionarán
- ❌ localStorage de contraseñas será removido
- ✅ La UI permanece igual (solo cambios internos)

---

## 🔐 NUEVA ARQUITECTURA DE SEGURIDAD

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO SEGURO PROPUESTO                     │
└─────────────────────────────────────────────────────────────┘

1. Usuario ingresa contraseña
   ↓
2. Frontend → POST /api/admin/login
   ↓
3. Backend compara con bcrypt.compare(password, ADMIN_SECRET_HASH)
   ↓
4. Si correcto → Genera JWT firmado con JWT_SECRET
   ↓
5. JWT se almacena en httpOnly cookie
   ↓
6. Middleware valida JWT en cada request
   ↓
7. Token expira en 2 horas (refresh disponible)
   ↓
8. Rate limiting: 5 intentos por IP cada 15 minutos
```

---

## 📝 NOTAS ADICIONALES

- **Prioridad:** CRÍTICA - Implementar lo antes posible
- **Tiempo estimado:** 4-6 horas de desarrollo
- **Testing requerido:** Extensivo antes de producción
- **Rollback:** Mantener backup de código actual

---

**Auditoría completada por:** AI Assistant  
**Próximo paso:** Implementar Fase 1 - Infraestructura

