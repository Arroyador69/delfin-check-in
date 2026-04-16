# ⚡ Inicio Rápido - App Móvil Delfín Check-in

## ✅ Estado Actual

- ✅ Repo creado: https://github.com/Arroyador69/DelfinCheckInApp (Privado)
- ✅ Código subido a GitHub
- ✅ Branches creados: `main` y `staging`
- ✅ `.gitignore` configurado (protege `.env` y secretos)

## 🚫 Sobre Vercel

**NO necesitas crear nada en Vercel para la app móvil.**

### ¿Por qué?
- La app móvil es una aplicación **nativa** (iOS/Android)
- Se ejecuta en **dispositivos móviles**, no en servidores web
- Se publica en **App Store** y **Play Store**, no en Vercel

### Vercel es solo para:
- ✅ Backend Next.js → `admin.delfincheckin.com` (ya existe)
- ✅ Staging Backend → `staging.delfincheckin.com` (ya existe)

### La app móvil usa:
- ✅ **EAS (Expo Application Services)** para builds
- ✅ **App Store Connect** para iOS
- ✅ **Google Play Console** para Android

## 🔐 Configuración Segura

### Variables de Entorno

**Opción 1: EAS Secrets (Recomendado para producción)**

```bash
# 1. Login en Expo
npx expo login

# 2. Inicializar EAS
npx eas init

# 3. Configurar secrets
npx eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://admin.delfincheckin.com
```

**Opción 2: Archivo `.env` local (Solo desarrollo)**

```bash
# Crear .env (NO se sube al repo, ya está en .gitignore)
echo "EXPO_PUBLIC_API_URL=https://staging.delfincheckin.com" > .env
echo "EXPO_PUBLIC_ENV=staging" >> .env
```

## 📱 Próximos Pasos

### 1. Instalar Dependencias

```bash
cd delfin-owner-app
npm install
```

### 2. Probar Localmente

```bash
# Iniciar Expo
npx expo start

# Escanear QR con Expo Go app (iOS/Android)
# O presionar 'i' para iOS simulator / 'a' para Android emulator
```

### 3. Configurar EAS (Para builds)

```bash
npx expo login
npx eas init
```

### 4. Configurar Cuentas de Desarrollador

**iOS:**
- Crear cuenta en https://developer.apple.com ($99/año)
- Configurar en App Store Connect

**Android:**
- Crear cuenta en https://play.google.com/console ($25 única vez)
- Configurar en Google Play Console

## 🎯 Resumen

| Componente | Dónde está | Hosting/Publicación |
|------------|------------|---------------------|
| Backend | Repo: `delfin-check-in` | Vercel → `admin.delfincheckin.com` |
| App Móvil | Repo: `DelfinCheckInApp` | App Store / Play Store |
| APIs | Ya funcionan | Se consumen desde la app |

**No necesitas Vercel para la app móvil** - Solo GitHub + EAS + Stores.

