# 📱 Guía Completa: App Móvil Delfín Check-in

## 📋 Índice
1. [Estructura de Repositorios](#estructura)
2. [Preparación del Backend](#backend)
3. [Setup de la App Móvil](#app-setup)
4. [Publicación en Stores](#stores)
5. [Flujo de Desarrollo](#flujo)

---

## 🗂️ Estructura de Repositorios {#estructura}

### Repositorio Actual (Backend)
```
delfin-check-in/
├── src/
│   ├── app/api/          # APIs existentes
│   └── middleware.ts     # Middleware multitenant
├── vercel.json
└── package.json
```

**Deploy:**
- `main` branch → `admin.delfincheckin.com` (Producción)
- `staging` branch → `staging.delfincheckin.com` (Staging)

### Nuevo Repositorio (App Móvil)
```
delfin-owner-app/
├── app/                  # Expo Router (pantallas)
├── components/           # Componentes React Native
├── lib/                  # API client, auth, etc.
├── hooks/               # Custom hooks
├── app.config.ts        # Config Expo
├── eas.json             # EAS Build config
└── package.json
```

**Builds:**
- `main` branch → App Store / Play Store (Producción)
- `staging` branch → TestFlight / Internal Testing (Staging)

---

## 🔧 Preparación del Backend {#backend}

### Paso 1: Crear endpoint de login móvil

**Archivo:** `src/app/api/auth/mobile-login/route.ts`

Este endpoint será idéntico a `/api/admin/login` pero devolverá tokens en JSON body en lugar de cookies.

### Paso 2: Adaptar middleware para Authorization header

**Archivo:** `src/middleware.ts`

Agregar soporte para `Authorization: Bearer <token>` además de cookies.

### Paso 3: Crear endpoint de refresh token

**Archivo:** `src/app/api/auth/refresh/route.ts`

Para renovar tokens sin re-login.

---

## 📱 Setup de la App Móvil {#app-setup}

### Requisitos Previos

1. **Node.js** (v18+)
2. **npm/pnpm/yarn**
3. **Expo CLI**: `npm install -g expo-cli eas-cli`
4. **Cuenta Expo**: https://expo.dev (gratis)

### Comandos Iniciales

```bash
# 1. Crear nuevo proyecto Expo
npx create-expo-app delfin-owner-app --template blank-typescript

# 2. Navegar al proyecto
cd delfin-owner-app

# 3. Instalar dependencias base
npm install @tanstack/react-query axios expo-secure-store expo-sqlite expo-notifications expo-router

# 4. Login en Expo
npx expo login

# 5. Inicializar EAS
npx eas init
```

---

## 🏪 Publicación en Stores {#stores}

### iOS (App Store) - Desde Mac

#### Requisitos:
- ✅ Mac con macOS
- ✅ Cuenta Apple Developer ($99/año)
- ✅ Xcode instalado (App Store)
- ✅ Certificados de desarrollo

#### Pasos:

**1. Crear cuenta Apple Developer**
- Ir a: https://developer.apple.com
- Registrarse ($99/año)
- Verificar email

**2. Configurar EAS para iOS**
```bash
# En el proyecto de la app
npx eas build:configure

# Editar eas.json para iOS
```

**3. Generar certificados automáticamente (EAS lo hace)**
```bash
npx eas build -p ios --profile production
```

**4. Subir a App Store Connect**
```bash
# EAS puede hacerlo automáticamente
npx eas submit -p ios
```

**5. Configurar en App Store Connect**
- Ir a: https://appstoreconnect.apple.com
- Crear nueva app
- Completar información (descripción, screenshots, etc.)
- Enviar para revisión

**Tiempo estimado:** 1-2 días para aprobación

---

### Android (Google Play Store)

#### Requisitos:
- ✅ Cuenta Google Play Developer ($25 única vez)
- ✅ No necesitas Mac (puedes desde cualquier OS)

#### Pasos:

**1. Crear cuenta Google Play Developer**
- Ir a: https://play.google.com/console
- Pagar $25 (única vez)
- Verificar cuenta

**2. Configurar EAS para Android**
```bash
npx eas build:configure
```

**3. Generar keystore (EAS lo hace automáticamente)**
```bash
npx eas build -p android --profile production
```

**4. Subir a Google Play Console**
```bash
npx eas submit -p android
```

**5. Configurar en Google Play Console**
- Crear nueva app
- Completar información
- Subir APK/AAB generado
- Enviar para revisión

**Tiempo estimado:** 1-3 días para aprobación

---

## 🔄 Flujo de Desarrollo {#flujo}

### Desarrollo Local

```bash
# Backend (en repo delfin-check-in)
git checkout staging
# Hacer cambios
git commit -m "feat: nuevo endpoint móvil"
git push origin staging
# Vercel deploya automáticamente a staging.delfincheckin.com

# App Móvil (en repo delfin-owner-app)
git checkout staging
# Cambiar API_URL a staging.delfincheckin.com
npx expo start
# Probar en simulador/emulador
```

### Testing en Dispositivos Reales

```bash
# iOS (TestFlight)
npx eas build -p ios --profile preview
# EAS genera link de TestFlight automáticamente

# Android (Internal Testing)
npx eas build -p android --profile preview
# Subir a Google Play Console → Internal Testing
```

### Producción

```bash
# 1. Merge staging → main en ambos repos
# 2. Backend se deploya automáticamente en Vercel
# 3. App móvil:
npx eas build -p ios --profile production
npx eas build -p android --profile production
npx eas submit -p ios
npx eas submit -p android
```

---

## 📝 Checklist Pre-Publicación

### iOS
- [ ] Cuenta Apple Developer activa
- [ ] App configurada en App Store Connect
- [ ] Screenshots (varios tamaños)
- [ ] Descripción y keywords
- [ ] Política de privacidad URL
- [ ] Icono y splash screen
- [ ] Build de producción generado
- [ ] TestFlight testing completado

### Android
- [ ] Cuenta Google Play Developer ($25 pagada)
- [ ] App configurada en Google Play Console
- [ ] Screenshots (varios tamaños)
- [ ] Descripción y keywords
- [ ] Política de privacidad URL
- [ ] Icono y splash screen
- [ ] Build de producción (AAB) generado
- [ ] Internal testing completado

---

## 🚀 Próximos Pasos

1. ✅ Adaptar backend para móvil (hoy)
2. ✅ Crear estructura básica de app móvil (hoy)
3. ⏳ Implementar login y dashboard básico (mañana)
4. ⏳ Testing en dispositivos reales (esta semana)
5. ⏳ Publicar en stores (próxima semana)

---

## 📚 Recursos Útiles

- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **Apple Developer**: https://developer.apple.com
- **Google Play Console**: https://play.google.com/console

