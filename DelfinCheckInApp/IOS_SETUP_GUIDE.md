# 📱 Guía Completa: Configuración iOS y Publicación en App Store

## ✅ Requisitos Previos

- ✅ Cuenta Apple Developer activa ($99/año)
- ✅ Mac con macOS
- ✅ Xcode instalado (App Store)

## 🔐 Paso 1: Obtener Credenciales de Apple Developer

### 1.1 Acceder a Apple Developer Portal

1. Ve a: https://developer.apple.com/account
2. Inicia sesión con tu cuenta de desarrollador
3. Ve a **Certificates, Identifiers & Profiles**

### 1.2 Obtener Team ID

1. En la parte superior derecha, verás tu **Team ID** (ej: `ABC123DEF4`)
2. **Cópialo** - lo necesitarás para `eas.json`

### 1.3 Crear App ID (si no existe)

1. Ve a **Identifiers** → **+** (nuevo)
2. Selecciona **App IDs** → **Continue**
3. Selecciona **App**
4. **Description**: `Delfín Check-in Owner App`
5. **Bundle ID**: `com.desarroyo.delfinowner` (debe coincidir con `app.config.ts`)
6. Selecciona **Capabilities** necesarias:
   - ✅ Push Notifications
   - ✅ Background Modes (si necesitas)
7. **Continue** → **Register**

### 1.4 Verificar Certificados

EAS puede generar certificados automáticamente, pero puedes verificar:

1. Ve a **Certificates**
2. Verás certificados de desarrollo y distribución
3. **EAS los generará automáticamente** si no existen

## 📋 Paso 2: Configurar App Store Connect

### 2.1 Crear App en App Store Connect

1. Ve a: https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. Completa:
   - **Platform**: iOS
   - **Name**: `Delfín Check-in`
   - **Primary Language**: Spanish
   - **Bundle ID**: Selecciona `com.desarroyo.delfinowner`
   - **SKU**: `delfin-owner-app` (único, no visible para usuarios)
   - **User Access**: Full Access
4. **Create**

### 2.2 Obtener App Store Connect API Key (Opcional pero recomendado)

**Opción A: App-Specific Password (Más simple)**

1. Ve a: https://appleid.apple.com
2. **Sign-In and Security** → **App-Specific Passwords**
3. **Generate an app-specific password**
4. Nombre: `EAS Build`
5. **Generate** → **Copia la contraseña** (solo se muestra una vez)

**Opción B: API Key (Más seguro para CI/CD)**

1. Ve a: https://appstoreconnect.apple.com/access/api
2. **Keys** → **+** (Generate API Key)
3. **Name**: `EAS Build Key`
4. **Access**: **App Manager**
5. **Generate** → **Download** el archivo `.p8`
6. **Copia el Key ID** (ej: `ABC123DEF4`)

## ⚙️ Paso 3: Configurar EAS

### 3.1 Login en Expo

```bash
cd delfin-owner-app
npx expo login
# Ingresa tus credenciales de Expo (o crea cuenta en expo.dev)
```

### 3.2 Inicializar EAS

```bash
npx eas init
```

Esto:
- Crea un proyecto EAS
- Genera `EAS_PROJECT_ID`
- Lo agrega a `app.config.ts`

### 3.3 Configurar Credenciales en EAS

**Opción A: EAS maneja todo automáticamente (Recomendado para empezar)**

EAS puede generar certificados automáticamente. Solo necesitas:

```bash
# Configurar credenciales de Apple
npx eas credentials

# Selecciona:
# - Platform: iOS
# - Workflow: Build credentials
# - EAS gestionará los certificados automáticamente
```

**Opción B: Configurar manualmente en `eas.json`**

Si prefieres control total, edita `eas.json`:

```json
{
  "build": {
    "production": {
      "ios": {
        "appleTeamId": "TU_TEAM_ID_AQUI"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "tu-email@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "TU_TEAM_ID_AQUI",
        "appSpecificPassword": "xxxx-xxxx-xxxx-xxxx"
      }
    }
  }
}
```

## 🏗️ Paso 4: Generar Build de Prueba

### 4.1 Build para TestFlight (Staging)

```bash
# Asegúrate de estar en staging branch
git checkout staging

# Build para TestFlight
npx eas build -p ios --profile preview
```

Esto:
- Genera un build en los servidores de EAS
- Tarda ~15-20 minutos
- Te dará un link para seguir el progreso

### 4.2 Subir a TestFlight Automáticamente

```bash
# Build + Submit automático
npx eas build -p ios --profile preview --auto-submit
```

O manualmente después del build:

```bash
npx eas submit -p ios --latest
```

## 📲 Paso 5: Configurar en App Store Connect

### 5.1 Completar Información de la App

1. Ve a tu app en App Store Connect
2. **App Information**:
   - Descripción
   - Keywords
   - Categoría
   - URL de soporte
   - URL de política de privacidad

### 5.2 Subir Screenshots

Necesitas screenshots en varios tamaños:
- iPhone 6.7" (iPhone 14 Pro Max)
- iPhone 6.5" (iPhone 11 Pro Max)
- iPhone 5.5" (iPhone 8 Plus)

**Cómo obtener screenshots:**
1. Ejecuta la app en simulador
2. Toma screenshots con `Cmd + S`
3. O usa herramientas como [Fastlane](https://fastlane.tools)

### 5.3 Configurar TestFlight

1. Ve a **TestFlight** en App Store Connect
2. Espera a que el build se procese (puede tardar 10-30 min)
3. Agrega **Internal Testers** (tu equipo)
4. O configura **External Testing** (beta pública)

## 🚀 Paso 6: Publicar en App Store

### 6.1 Preparar para Revisión

1. Ve a **App Store** tab en App Store Connect
2. Completa toda la información requerida
3. Selecciona el build que quieres publicar
4. **Submit for Review**

### 6.2 Revisión de Apple

- Tiempo típico: 24-48 horas
- Pueden pedirte cambios o aclaraciones
- Recibirás notificaciones por email

## 📝 Resumen de Credenciales Necesarias

### Para EAS Build:

1. **Apple Team ID**: Lo encuentras en https://developer.apple.com/account
2. **Apple ID**: Tu email de Apple Developer
3. **App-Specific Password**: De https://appleid.apple.com (si usas submit automático)

### Dónde ponerlas:

**Opción 1: EAS Credentials (Recomendado)**
```bash
npx eas credentials
# EAS te guiará paso a paso
```

**Opción 2: eas.json**
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "tu-email@example.com",
        "appleTeamId": "ABC123DEF4",
        "appSpecificPassword": "xxxx-xxxx-xxxx-xxxx"
      }
    }
  }
}
```

**Opción 3: Variables de Entorno (Más seguro)**
```bash
# Configurar en EAS secrets
npx eas secret:create --scope project --name APPLE_ID --value tu-email@example.com
npx eas secret:create --scope project --name APPLE_TEAM_ID --value ABC123DEF4
npx eas secret:create --scope project --name APPLE_APP_SPECIFIC_PASSWORD --value xxxx-xxxx-xxxx-xxxx
```

## 🎯 Comandos Útiles

```bash
# Ver estado de builds
npx eas build:list

# Ver credenciales configuradas
npx eas credentials

# Build de producción
npx eas build -p ios --profile production

# Submit a App Store
npx eas submit -p ios --latest

# Ver logs de build
npx eas build:view [BUILD_ID]
```

## ⚠️ Notas Importantes

1. **Bundle ID**: Debe ser único y coincidir en:
   - `app.config.ts`
   - Apple Developer Portal
   - App Store Connect

2. **Certificados**: EAS los genera automáticamente, pero puedes verlos en:
   - Apple Developer Portal → Certificates

3. **TestFlight**: Los builds de `preview` van a TestFlight automáticamente

4. **Producción**: Los builds de `production` necesitan ser enviados manualmente a App Store

## 🔗 Enlaces Útiles

- Apple Developer: https://developer.apple.com/account
- App Store Connect: https://appstoreconnect.apple.com
- EAS Docs: https://docs.expo.dev/build/introduction/
- EAS Submit: https://docs.expo.dev/submit/introduction/

