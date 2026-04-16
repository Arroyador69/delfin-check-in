# 🔐 Guía Rápida: Credenciales de iOS para EAS

## 📍 Dónde Encontrar las Credenciales

### 1. Apple Team ID

**Ubicación:** https://developer.apple.com/account

1. Inicia sesión
2. En la parte superior derecha verás: **Team ID: `ABC123DEF4`**
3. **Cópialo** - lo necesitarás

### 2. Apple ID (Email)

Es el email con el que te registraste en Apple Developer.

### 3. App-Specific Password (Para Submit Automático)

**Ubicación:** https://appleid.apple.com

1. Inicia sesión
2. Ve a **Sign-In and Security**
3. Busca **App-Specific Passwords**
4. **Generate an app-specific password**
5. Nombre: `EAS Build`
6. **Generate** → Copia la contraseña (formato: `xxxx-xxxx-xxxx-xxxx`)

### 4. App Store Connect App ID (Opcional)

**Ubicación:** https://appstoreconnect.apple.com

1. Ve a tu app
2. En **App Information** → **General Information**
3. Verás **Apple ID**: `1234567890` (número)
4. Este es el `ascAppId` para submit automático

## ⚙️ Cómo Configurarlas en EAS

### Opción 1: EAS Credentials (Interactivo - Recomendado)

```bash
npx eas credentials
```

EAS te preguntará:
1. Platform: `iOS`
2. Workflow: `Build credentials` o `Submit credentials`
3. Te pedirá:
   - Apple ID
   - Team ID
   - App-Specific Password (si es para submit)

### Opción 2: eas.json (Manual)

Edita `eas.json`:

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
        "appleTeamId": "ABC123DEF4",
        "appSpecificPassword": "xxxx-xxxx-xxxx-xxxx"
      }
    }
  }
}
```

### Opción 3: EAS Secrets (Más Seguro)

```bash
# Configurar secrets (no se ven en el código)
npx eas secret:create --scope project --name APPLE_ID --value tu-email@example.com
npx eas secret:create --scope project --name APPLE_TEAM_ID --value ABC123DEF4
npx eas secret:create --scope project --name APPLE_APP_SPECIFIC_PASSWORD --value xxxx-xxxx-xxxx-xxxx
```

Luego en `eas.json` puedes referenciarlos (EAS los inyecta automáticamente).

## 🎯 Recomendación

**Para empezar:** Usa `npx eas credentials` - es interactivo y más fácil.

**Para producción:** Usa EAS Secrets para mayor seguridad.

## 📝 Checklist

- [ ] Apple Team ID obtenido
- [ ] Apple ID (email) confirmado
- [ ] App-Specific Password generado (si quieres submit automático)
- [ ] Credenciales configuradas en EAS

## 🔗 Enlaces Directos

- **Apple Developer Portal**: https://developer.apple.com/account
- **Apple ID Settings**: https://appleid.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com

