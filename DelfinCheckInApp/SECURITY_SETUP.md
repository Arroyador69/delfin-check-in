# 🔒 Configuración Segura: Variables de Entorno y EAS

## ✅ Repositorio Privado

**Repo:** https://github.com/Arroyador69/DelfinCheckInApp (Privado ✅)

## 🔐 Variables de Entorno Seguras

### ❌ NO subir al repo:
- `.env` con secretos (ya está en `.gitignore` ✅)
- Certificados/keystores
- Tokens privados

### ✅ SÍ está bien en el repo:
- URLs públicas de APIs (`https://admin.delfincheckin.com`)
- Configuración pública (`app.config.ts`, `eas.json`)
- Código fuente

## 📋 Configuración de EAS Secrets (Recomendado)

### Paso 1: Login en Expo

```bash
npx expo login
# Ingresa tus credenciales de Expo
```

### Paso 2: Inicializar EAS en el proyecto

```bash
cd delfin-owner-app
npx eas init
```

Esto creará un `EAS_PROJECT_ID` que se agregará automáticamente a `app.config.ts`.

### Paso 3: Configurar Secrets para Producción

```bash
# API URL de producción
npx eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://admin.delfincheckin.com --type string

# Entorno de producción
npx eas secret:create --scope project --name EXPO_PUBLIC_ENV --value production --type string
```

### Paso 4: Configurar Secrets para Staging (Opcional)

```bash
# Para builds de staging, usar variables diferentes
npx eas secret:create --scope project --name EXPO_PUBLIC_STAGING_API_URL --value https://staging.delfincheckin.com --type string
```

### Paso 5: Verificar Secrets

```bash
npx eas secret:list
```

## 🏗️ Configuración de Builds

### Actualizar `eas.json` para usar secrets

El archivo `eas.json` ya está configurado, pero puedes personalizar:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_ENV": "staging",
        "EXPO_PUBLIC_API_URL": "https://staging.delfincheckin.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_API_URL": "https://admin.delfincheckin.com"
      }
    }
  }
}
```

## 🔄 Flujo de Trabajo Seguro

### Desarrollo Local

```bash
# Crear .env local (NO se sube al repo)
echo "EXPO_PUBLIC_API_URL=https://staging.delfincheckin.com" > .env
echo "EXPO_PUBLIC_ENV=staging" >> .env

# Instalar dependencias
npm install

# Desarrollo
npx expo start
```

### Builds con EAS

```bash
# Build de staging (usa secrets de EAS)
npx eas build -p ios --profile preview --branch staging

# Build de producción (usa secrets de EAS)
npx eas build -p ios --profile production --branch main
```

## 📱 Vercel: NO es necesario

**La app móvil NO se deploya en Vercel.**

- ✅ Backend Next.js → Vercel (`admin.delfincheckin.com`)
- ✅ App Móvil → EAS Builds → App Store/Play Store

**No necesitas:**
- ❌ Nuevo proyecto en Vercel para la app móvil
- ❌ Nuevo subdominio para la app móvil
- ❌ Configuración adicional en Vercel

## 🎯 Checklist de Seguridad

- [x] Repo privado en GitHub ✅
- [x] `.env` en `.gitignore` ✅
- [ ] Configurar EAS secrets (siguiente paso)
- [ ] Inicializar EAS project
- [ ] Configurar cuentas de desarrollador (Apple/Google)

## 📚 Próximos Pasos

1. ✅ Código subido a GitHub
2. ⏳ Configurar EAS secrets
3. ⏳ Instalar dependencias: `npm install`
4. ⏳ Probar localmente: `npx expo start`
5. ⏳ Configurar cuentas de desarrollador
6. ⏳ Generar primer build de prueba

