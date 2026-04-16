# 📱 Delfín Owner App

Aplicación móvil para propietarios de Delfín Check-in (iOS/Android)

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Desarrollo
npx expo start

# iOS (requiere Mac)
npx expo run:ios

# Android
npx expo run:android
```

## 📦 Estructura

```
app/                    # Pantallas (Expo Router)
  (auth)/
    index.tsx          # Login
  (app)/
    index.tsx          # Dashboard
    reservations.tsx   # Reservas
    invoices.tsx      # Facturación
    settings.tsx      # Ajustes

components/            # Componentes reutilizables
lib/                   # API client, auth, etc.
hooks/                 # Custom hooks
```

## 🔐 Autenticación

La app usa JWT tokens almacenados en SecureStore.

**Endpoints:**
- `POST /api/auth/mobile-login` - Login
- `POST /api/auth/refresh` - Renovar token

## 🌐 Variables de Entorno

Crear `.env`:

```env
EXPO_PUBLIC_API_URL=https://admin.delfincheckin.com
# Para staging:
# EXPO_PUBLIC_API_URL=https://staging.delfincheckin.com
```

## 📱 Builds

### Desarrollo
```bash
npx eas build -p ios --profile development
npx eas build -p android --profile development
```

### Staging (TestFlight/Internal)
```bash
npx eas build -p ios --profile preview
npx eas build -p android --profile preview
```

### Producción
```bash
npx eas build -p ios --profile production
npx eas build -p android --profile production
```

## 📚 Documentación

Ver `MOBILE_APP_SETUP.md` en el repo del backend para guía completa.

