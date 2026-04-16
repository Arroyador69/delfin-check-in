# 📤 Comando para Subir a App Store Connect

## Ejecuta este comando en tu terminal:

```bash
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-owner-app"
eas submit -p ios --profile production --latest
```

## Lo que te pedirá EAS:

1. **Apple ID:** Tu email de Apple Developer
2. **Contraseña:** Tu contraseña de Apple ID (o App-Specific Password)
3. **App ID (ascAppId):** El número de tu app en App Store Connect (solo dígitos)
   - Ve a App Store Connect → Tu app → App Information
   - Copia el número (ej: 1234567890)
4. **Team ID:** Tu Apple Team ID (10 caracteres)
   - Ve a Apple Developer Portal → Membership
   - Copia el Team ID (ej: Q83V2SR94Z)

## Alternativa: Subir Manualmente

Si prefieres subir manualmente:

```bash
# 1. Descargar el .ipa
curl -L https://expo.dev/artifacts/eas/adHFfXPoeW2mMeadS3NAqA.ipa -o delfin-checkin.ipa

# 2. Abrir Transporter y arrastrar el .ipa
open -a Transporter
```

