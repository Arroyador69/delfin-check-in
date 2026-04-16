# 🚀 Guía: Compilar y Subir a App Store

## 📋 Prerrequisitos

### 1. Cuenta de Desarrollador de Apple
- ✅ Cuenta de Apple Developer activa ($99/año)
- ✅ App ID creado en Apple Developer Portal
- ✅ Certificados de distribución configurados

### 2. App Store Connect
- ✅ App creada en App Store Connect
- ✅ Bundle ID: `com.desarroyo.delfinowner`
- ✅ Información de la app completada (descripción, screenshots, etc.)

### 3. EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 4. Configuración de EAS
El archivo `eas.json` ya está configurado. Solo necesitas actualizar las credenciales de Apple.

## 🔧 Configuración Inicial

### Paso 1: Configurar Credenciales de Apple

Edita `eas.json` y actualiza la sección `submit.production.ios`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "tu-email@ejemplo.com",
        "ascAppId": "tu-app-store-connect-app-id",
        "appleTeamId": "tu-team-id"
      }
    }
  }
}
```

**Opcional:** Puedes configurarlo interactivamente con:
```bash
eas credentials
```

### Paso 2: Verificar Configuración de la App

Verifica que `app.config.ts` tenga:
- ✅ `bundleIdentifier`: `com.desarroyo.delfinowner`
- ✅ `version`: Versión actual (ej: `1.0.0`)
- ✅ `ios.buildNumber`: Número de build (se auto-incrementa en producción)

## 🏗️ Compilar para Producción

### Opción 1: Build Local (más rápido para pruebas)

```bash
cd delfin-owner-app
npx eas build -p ios --profile production --local
```

**Nota:** Requiere Xcode instalado y configurado.

### Opción 2: Build en la Nube (Recomendado)

```bash
cd delfin-owner-app
npx eas build -p ios --profile production
```

Este comando:
1. Sube tu código a EAS Build
2. Compila en la nube
3. Genera el archivo `.ipa` listo para App Store
4. Te da un enlace para descargar

## 📤 Subir a App Store Connect

### Opción 1: Automático (Recomendado)

Después del build, sube automáticamente:

```bash
eas submit -p ios --profile production
```

Esto requiere que hayas configurado las credenciales en `eas.json`.

### Opción 2: Manual

1. Descarga el `.ipa` del build
2. Usa **Transporter** (app de Apple) o **Xcode**
3. Sube el `.ipa` a App Store Connect

## ✅ Checklist Antes de Compilar

- [ ] Icono actualizado (`assets/icon.png` - 1024x1024px)
- [ ] Splash screen actualizado (`assets/splash.png`)
- [ ] Versión actualizada en `app.config.ts`
- [ ] Bundle ID correcto (`com.desarroyo.delfinowner`)
- [ ] Variables de entorno configuradas (si es necesario)
- [ ] Credenciales de Apple configuradas en `eas.json`
- [ ] App creada en App Store Connect

## 🎯 Comandos Rápidos

### Build de Producción
```bash
npx eas build -p ios --profile production
```

### Build y Submit Automático
```bash
npx eas build -p ios --profile production --auto-submit
```

### Ver Estado del Build
```bash
eas build:list
```

### Ver Detalles de un Build
```bash
eas build:view [BUILD_ID]
```

## 📱 Para TestFlight (Pruebas Internas)

Si quieres probar antes de publicar:

```bash
# Build para preview (TestFlight)
npx eas build -p ios --profile preview

# O build de producción y luego distribuir a TestFlight
npx eas build -p ios --profile production
# Luego en App Store Connect, distribuye a TestFlight
```

## 🔍 Troubleshooting

### Error: "No credentials found"
```bash
eas credentials
```

### Error: "Bundle ID not found"
- Ve a Apple Developer Portal
- Crea el App ID con bundle ID: `com.desarroyo.delfinowner`

### Error: "Icon missing"
- Verifica que `assets/icon.png` existe y es 1024x1024px
- Ejecuta: `file assets/icon.png`

### Build Falla
- Revisa los logs: `eas build:view [BUILD_ID]`
- Verifica que todas las dependencias estén instaladas
- Asegúrate de que el código compile localmente primero

## 📚 Recursos

- [Documentación de EAS Build](https://docs.expo.dev/build/introduction/)
- [Guía de App Store Connect](https://developer.apple.com/app-store-connect/)
- [Expo EAS Submit](https://docs.expo.dev/submit/introduction/)

