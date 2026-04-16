# 🚀 Próximos Pasos - Configuración iOS

## ✅ Lo que ya está hecho

- ✅ Dependencias instaladas
- ✅ Código subido a GitHub
- ✅ Estructura de la app lista
- ✅ Documentación creada

## 📋 Pasos Inmediatos

### 1. Login en Expo (Ahora)

```bash
cd delfin-owner-app
npx expo login
```

Si no tienes cuenta Expo, créala en: https://expo.dev/signup

### 2. Inicializar EAS

```bash
npx eas init
```

Esto creará el proyecto EAS y generará el `EAS_PROJECT_ID`.

### 3. Obtener Credenciales de Apple Developer

#### 3.1 Apple Team ID

1. Ve a: **https://developer.apple.com/account**
2. Inicia sesión
3. En la parte superior derecha verás: **Team ID: `ABC123DEF4`**
4. **Cópialo** ✂️

#### 3.2 Apple ID

Es el email con el que te registraste en Apple Developer.

#### 3.3 App-Specific Password (Opcional - para submit automático)

1. Ve a: **https://appleid.apple.com**
2. **Sign-In and Security** → **App-Specific Passwords**
3. **Generate an app-specific password**
4. Nombre: `EAS Build`
5. **Generate** → Copia la contraseña (formato: `xxxx-xxxx-xxxx-xxxx`)

### 4. Configurar Credenciales en EAS

**Opción A: Interactivo (Recomendado para empezar)**

```bash
npx eas credentials
```

Selecciona:
- Platform: `iOS`
- Workflow: `Build credentials`
- EAS te pedirá:
  - Apple ID
  - Team ID
  - Te ayudará a generar certificados automáticamente

**Opción B: Manual en eas.json**

Edita `eas.json` y agrega:

```json
{
  "build": {
    "production": {
      "ios": {
        "appleTeamId": "TU_TEAM_ID_AQUI"
      }
    },
    "preview": {
      "ios": {
        "appleTeamId": "TU_TEAM_ID_AQUI"
      }
    }
  }
}
```

### 5. Crear App ID en Apple Developer (si no existe)

1. Ve a: **https://developer.apple.com/account/resources/identifiers/list**
2. **+** (nuevo)
3. Selecciona **App IDs** → **Continue**
4. Selecciona **App**
5. **Description**: `Delfín Check-in Owner App`
6. **Bundle ID**: `com.desarroyo.delfinowner` (debe coincidir con `app.config.ts`)
7. Selecciona **Capabilities**:
   - ✅ Push Notifications
8. **Continue** → **Register**

### 6. Crear App en App Store Connect

1. Ve a: **https://appstoreconnect.apple.com**
2. **My Apps** → **+** → **New App**
3. Completa:
   - **Platform**: iOS
   - **Name**: `Delfín Check-in`
   - **Primary Language**: Spanish
   - **Bundle ID**: Selecciona `com.desarroyo.delfinowner`
   - **SKU**: `delfin-owner-app`
4. **Create**

### 7. Generar Primer Build de Prueba

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

### 8. Subir a TestFlight

Una vez completado el build:

```bash
npx eas submit -p ios --latest
```

O espera a que aparezca en App Store Connect automáticamente.

## 📝 Resumen de Credenciales

| Credencial | Dónde encontrarla | Dónde ponerla |
|------------|-------------------|---------------|
| **Apple Team ID** | https://developer.apple.com/account (arriba derecha) | `eas.json` o `npx eas credentials` |
| **Apple ID** | Tu email de Apple Developer | `eas.json` o `npx eas credentials` |
| **App-Specific Password** | https://appleid.apple.com → App-Specific Passwords | `eas.json` (solo si quieres submit automático) |
| **App Store Connect App ID** | https://appstoreconnect.apple.com → Tu app → App Information | `eas.json` (solo si quieres submit automático) |

## 🎯 Comandos Útiles

```bash
# Ver credenciales configuradas
npx eas credentials

# Ver builds
npx eas build:list

# Build de producción
npx eas build -p ios --profile production

# Submit a App Store
npx eas submit -p ios --latest
```

## 📚 Documentación Completa

- **Guía completa iOS**: `IOS_SETUP_GUIDE.md`
- **Guía de credenciales**: `CREDENTIALS_GUIDE.md`
- **Setup general**: `SETUP_GUIDE.md`

## ⚠️ Notas Importantes

1. **Bundle ID**: Debe ser `com.desarroyo.delfinowner` en:
   - `app.config.ts` ✅ (ya configurado)
   - Apple Developer Portal (crear App ID)
   - App Store Connect (al crear la app)

2. **Certificados**: EAS los genera automáticamente, no necesitas crearlos manualmente.

3. **TestFlight**: Los builds de `preview` van a TestFlight automáticamente.

4. **Tiempo**: El primer build puede tardar más porque EAS genera certificados.

## 🔗 Enlaces Directos

- **Apple Developer Portal**: https://developer.apple.com/account
- **Apple ID Settings**: https://appleid.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Dashboard**: https://expo.dev/accounts/[tu-usuario]/projects

