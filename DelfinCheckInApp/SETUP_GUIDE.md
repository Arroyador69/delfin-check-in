# 🚀 Guía de Setup: App Móvil Delfín Check-in

## ✅ Repositorio GitHub

**Repo:** https://github.com/Arroyador69/DelfinCheckInApp (Privado ✅)

## 📋 Pasos para Subir Código

### 1. Inicializar Git y Subir Código

```bash
# Navegar al directorio de la app
cd delfin-owner-app

# Inicializar git
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "feat: estructura inicial de app móvil"

# Agregar remote de GitHub
git remote add origin https://github.com/Arroyador69/DelfinCheckInApp.git

# Subir código
git branch -M main
git push -u origin main
```

### 2. Crear Branch de Staging

```bash
# Crear branch staging
git checkout -b staging

# Push staging branch
git push -u origin staging
```

## 🔐 Variables de Entorno Seguras

### NO subir `.env` al repo (ya está en .gitignore)

### Configurar en EAS Secrets (recomendado)

```bash
# Login en Expo
npx expo login

# Configurar secrets para producción
npx eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://admin.delfincheckin.com

# Configurar secrets para staging
npx eas secret:create --scope project --name EXPO_PUBLIC_STAGING_API_URL --value https://staging.delfincheckin.com
```

### O usar archivos `.env` locales (solo desarrollo)

Crear `.env` (NO se sube al repo):
```env
EXPO_PUBLIC_API_URL=https://admin.delfincheckin.com
EXPO_PUBLIC_ENV=production
```

## 🏗️ EAS Build Configuration

### Inicializar EAS

```bash
npx eas init
```

Esto creará un `EAS_PROJECT_ID` que se agregará a `app.config.ts`.

### Configurar Builds

El archivo `eas.json` ya está configurado con:
- `development` - Para desarrollo local
- `preview` - Para TestFlight/Internal Testing (staging)
- `production` - Para App Store/Play Store

## 📱 Staging vs Producción

### Opción A: Branches separados (Recomendado)

```
main branch:
  - API_URL: https://admin.delfincheckin.com
  - Bundle ID: com.desarroyo.delfinowner
  - → App Store / Play Store

staging branch:
  - API_URL: https://staging.delfincheckin.com
  - Bundle ID: com.desarroyo.delfinowner.dev
  - → TestFlight / Internal Testing
```

### Opción B: Feature flags (más complejo)

Usar la misma app y detectar entorno desde backend.

**Recomendación: Opción A (branches separados)**

## 🔒 Seguridad

### ✅ Lo que SÍ está bien en el repo:
- Código fuente
- `app.config.ts` (sin secretos)
- `eas.json` (configuración pública)
- URLs públicas de APIs

### ❌ Lo que NO debe estar en el repo:
- `.env` con secretos (ya en .gitignore ✅)
- Certificados/keystores (EAS los maneja)
- Tokens de API privados
- Credenciales de stores

## 📦 Próximos Pasos

1. ✅ Subir código a GitHub
2. ✅ Configurar EAS secrets
3. ⏳ Instalar dependencias: `npm install`
4. ⏳ Probar localmente: `npx expo start`
5. ⏳ Configurar cuentas de desarrollador (Apple/Google)
6. ⏳ Generar primer build de prueba

## 🎯 Comandos Útiles

```bash
# Desarrollo local
npm install
npx expo start

# Build para iOS (requiere Mac)
npx eas build -p ios --profile preview

# Build para Android
npx eas build -p android --profile preview

# Ver builds
npx eas build:list

# Verificar configuración
npx eas build:configure
```

