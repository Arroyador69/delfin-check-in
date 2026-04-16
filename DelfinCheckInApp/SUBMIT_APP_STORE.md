# 📤 Subir App a App Store Connect

## ✅ Build Completado

Tu build está listo:
- **URL del .ipa:** https://expo.dev/artifacts/eas/adHFfXPoeW2mMeadS3NAqA.ipa

## 📋 Opciones para Subir

### Opción 1: EAS Submit Automático (Recomendado)

Primero necesitas configurar tus credenciales de Apple. Ejecuta:

```bash
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-owner-app"
eas submit -p ios --profile production --latest
```

EAS te pedirá interactivamente:
1. **Apple ID:** Tu email de Apple Developer
2. **App Store Connect API Key:** O tu contraseña de Apple ID
3. **App ID:** El ID de tu app en App Store Connect (solo números, ej: 1234567890)
4. **Team ID:** Tu Apple Team ID (10 caracteres, ej: ABC123DEF4)

### Opción 2: Configurar en eas.json

Si prefieres configurarlo en el archivo, edita `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "tu-email@ejemplo.com",
        "ascAppId": "1234567890",  // Solo números, sin espacios
        "appleTeamId": "ABC123DEF4"  // 10 caracteres alfanuméricos
      }
    }
  }
}
```

Luego ejecuta:
```bash
eas submit -p ios --profile production --latest
```

### Opción 3: Subir Manualmente con Transporter

1. **Descargar el .ipa:**
   ```bash
   curl -L https://expo.dev/artifacts/eas/adHFfXPoeW2mMeadS3NAqA.ipa -o delfin-checkin.ipa
   ```

2. **Abrir Transporter:**
   - Abre la app **Transporter** (de Apple, disponible en Mac App Store)
   - O usa Xcode: Window > Organizer > Archives

3. **Subir el .ipa:**
   - Arrastra el archivo `.ipa` a Transporter
   - Haz clic en "Deliver"
   - Espera a que se suba

## 🔍 Cómo Obtener las Credenciales

### App Store Connect App ID (ascAppId)
1. Ve a [App Store Connect](https://appstoreconnect.apple.com/)
2. Selecciona tu app (o créala si es la primera vez)
3. Ve a "App Information"
4. El **Apple ID** es el número que aparece (ej: 1234567890)

### Apple Team ID
1. Ve a [Apple Developer Portal](https://developer.apple.com/account/)
2. Ve a "Membership"
3. Tu **Team ID** aparece ahí (10 caracteres)

### Apple ID
- Es el email que usas para iniciar sesión en Apple Developer y App Store Connect

## ✅ Después de Subir

Una vez subido:
1. Ve a App Store Connect
2. Completa la información de la app:
   - Descripción
   - Screenshots (requeridos)
   - Categoría
   - Información de privacidad
   - Etc.
3. Envía para revisión

## 🆘 Troubleshooting

### "Invalid App ID"
- Asegúrate de que sea solo números (sin espacios ni guiones)
- Debe ser el ID de App Store Connect, no el Bundle ID

### "Invalid Team ID"
- Debe tener exactamente 10 caracteres
- Solo letras mayúsculas y números

### "App not found"
- Crea la app en App Store Connect primero
- Usa el mismo Bundle ID: `com.desarroyo.delfinowner`

