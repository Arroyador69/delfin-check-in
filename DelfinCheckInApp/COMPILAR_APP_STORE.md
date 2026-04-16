# 🚀 Compilar y Subir a App Store - Guía Paso a Paso

## ✅ Estado Actual

- ✅ Icono configurado (`assets/icon.png` - 1024x1024px)
- ✅ Configuración lista (`app.config.ts`, `eas.json`)
- ✅ EAS CLI instalado y logueado
- ✅ Proyecto EAS configurado

## 📋 Pasos para Compilar y Subir

### Paso 1: Configurar Credenciales de iOS (Primera vez)

Ejecuta este comando para configurar las credenciales:

```bash
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-owner-app"
eas credentials
```

**Selecciona:**
1. `iOS` (plataforma)
2. `production` (perfil)
3. EAS puede generar automáticamente los certificados y perfiles, o puedes usar los tuyos existentes

### Paso 2: Compilar la App

Una vez configuradas las credenciales, ejecuta:

```bash
npx eas build -p ios --profile production
```

**Durante el proceso:**
- Se te preguntará sobre el source de versión → Selecciona **opción 2** (remote - recomendado)
- EAS compilará tu app en la nube
- El proceso toma aproximadamente 15-30 minutos
- Recibirás un enlace para descargar el `.ipa` cuando termine

### Paso 3: Subir a App Store Connect

**Opción A: Automático (Recomendado)**

Primero configura tus credenciales de Apple en `eas.json`:

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

Luego ejecuta:

```bash
eas submit -p ios --profile production
```

**Opción B: Manual**

1. Descarga el `.ipa` desde el enlace que te proporcionó EAS
2. Abre **Transporter** (app de Apple) o **Xcode**
3. Arrastra el `.ipa` a Transporter
4. Sube a App Store Connect

### Paso 4: Completar Información en App Store Connect

1. Ve a [App Store Connect](https://appstoreconnect.apple.com/)
2. Selecciona tu app (o créala si es la primera vez)
3. Completa:
   - Descripción
   - Screenshots (requeridos)
   - Categoría
   - Información de privacidad
   - Etc.

### Paso 5: Enviar para Revisión

Una vez que todo esté completo, envía la app para revisión desde App Store Connect.

## 🎯 Comandos Rápidos

```bash
# 1. Configurar credenciales (solo primera vez)
eas credentials

# 2. Compilar
npx eas build -p ios --profile production

# 3. Subir a App Store Connect
eas submit -p ios --profile production

# Ver estado de builds
eas build:list

# Ver detalles de un build específico
eas build:view [BUILD_ID]
```

## 📱 Información de la App

- **Bundle ID:** `com.desarroyo.delfinowner`
- **Nombre:** `Delfín Check-in`
- **Versión:** `1.0.0`
- **Build Number:** Se auto-incrementa con EAS

## ⚠️ Notas Importantes

1. **Primera vez:** Necesitarás configurar las credenciales de iOS interactivamente
2. **App Store Connect:** Asegúrate de tener la app creada en App Store Connect antes de subir
3. **Screenshots:** Necesitarás screenshots de diferentes tamaños de iPhone para App Store Connect
4. **Tiempo:** El build toma tiempo, pero puedes ver el progreso en https://expo.dev

## 🆘 Troubleshooting

### "Credentials not set up"
```bash
eas credentials
```

### "App not found in App Store Connect"
- Crea la app en App Store Connect primero
- Usa el mismo Bundle ID: `com.desarroyo.delfinowner`

### "Build failed"
- Revisa los logs: `eas build:view [BUILD_ID]`
- Verifica que el icono esté en `assets/icon.png`
- Asegúrate de que todas las dependencias estén instaladas

## ✅ Checklist Final

- [ ] Credenciales de iOS configuradas
- [ ] Build completado exitosamente
- [ ] `.ipa` descargado o subido
- [ ] App creada en App Store Connect
- [ ] Información completada (descripción, screenshots, etc.)
- [ ] App enviada para revisión

¡Listo para compilar! 🚀

