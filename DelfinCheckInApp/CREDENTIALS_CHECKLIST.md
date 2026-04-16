# ✅ Checklist: Credenciales de iOS

## 🔐 Credenciales Necesarias

### 1. Apple Team ID ⭐ **OBLIGATORIO**

**Dónde obtenerlo:**
1. Ve a: https://developer.apple.com/account
2. Inicia sesión con tu cuenta de desarrollador
3. En la parte superior derecha verás: **Team ID: `ABC123DEF4`**
4. **Cópialo** ✂️

**Dónde ponerlo:**
- Opción A: `npx eas credentials` (interactivo)
- Opción B: `eas.json` → `build.production.ios.appleTeamId`
- Opción C: EAS Secrets → `APPLE_TEAM_ID`

**Tu Team ID:** `_________________` (escríbelo aquí cuando lo tengas)

---

### 2. Apple ID (Email) ⭐ **OBLIGATORIO**

**Dónde obtenerlo:**
- Es el email con el que te registraste en Apple Developer

**Dónde ponerlo:**
- Opción A: `npx eas credentials` (interactivo)
- Opción B: `eas.json` → `submit.production.ios.appleId`
- Opción C: EAS Secrets → `APPLE_ID`

**Tu Apple ID:** `_________________` (escríbelo aquí cuando lo tengas)

---

### 3. App-Specific Password ⚠️ **OPCIONAL** (solo para submit automático)

**Dónde obtenerlo:**
1. Ve a: https://appleid.apple.com
2. Inicia sesión
3. Ve a **Sign-In and Security**
4. Busca **App-Specific Passwords**
5. **Generate an app-specific password**
6. Nombre: `EAS Build`
7. **Generate** → Copia la contraseña (formato: `xxxx-xxxx-xxxx-xxxx`)

**Dónde ponerlo:**
- Opción A: `eas.json` → `submit.production.ios.appSpecificPassword`
- Opción B: EAS Secrets → `APPLE_APP_SPECIFIC_PASSWORD`

**Tu App-Specific Password:** `_________________` (solo si quieres submit automático)

---

### 4. App Store Connect App ID ⚠️ **OPCIONAL** (solo para submit automático)

**Dónde obtenerlo:**
1. Ve a: https://appstoreconnect.apple.com
2. Ve a tu app (o créala primero)
3. En **App Information** → **General Information**
4. Verás **Apple ID**: `1234567890` (número)

**Dónde ponerlo:**
- `eas.json` → `submit.production.ios.ascAppId`

**Tu App Store Connect App ID:** `_________________` (solo si quieres submit automático)

---

## 📋 Pasos de Configuración

### Paso 1: Obtener Credenciales
- [ ] Apple Team ID obtenido
- [ ] Apple ID confirmado
- [ ] App-Specific Password generado (opcional)
- [ ] App Store Connect App ID obtenido (opcional)

### Paso 2: Configurar en EAS

**Opción A: Interactivo (Recomendado)**

```bash
npx eas credentials
```

- [ ] Ejecutado `npx eas credentials`
- [ ] Configurado Team ID
- [ ] Configurado Apple ID
- [ ] Certificados generados automáticamente

**Opción B: Manual en eas.json**

- [ ] Editado `eas.json`
- [ ] Agregado `appleTeamId` en `build.production.ios`
- [ ] Agregado `appleId` en `submit.production.ios` (si quieres submit automático)
- [ ] Agregado `appSpecificPassword` en `submit.production.ios` (si quieres submit automático)

**Opción C: EAS Secrets (Más seguro)**

```bash
npx eas secret:create --scope project --name APPLE_TEAM_ID --value TU_TEAM_ID
npx eas secret:create --scope project --name APPLE_ID --value tu-email@example.com
npx eas secret:create --scope project --name APPLE_APP_SPECIFIC_PASSWORD --value xxxx-xxxx-xxxx-xxxx
```

- [ ] Secrets creados en EAS

### Paso 3: Verificar Configuración

```bash
npx eas credentials
```

- [ ] Credenciales verificadas
- [ ] Certificados generados correctamente

---

## 🎯 Resumen Rápido

**Mínimo necesario para hacer builds:**
1. ✅ Apple Team ID
2. ✅ Apple ID

**Para submit automático a App Store:**
3. ✅ App-Specific Password
4. ✅ App Store Connect App ID

---

## 🔗 Enlaces Directos

- **Apple Developer Portal**: https://developer.apple.com/account
- **Apple ID Settings**: https://appleid.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Dashboard**: https://expo.dev

---

## 📝 Notas

- **Certificados**: EAS los genera automáticamente, no necesitas crearlos manualmente
- **Bundle ID**: Debe ser `com.desarroyo.delfinowner` en todos lados
- **Primera vez**: El primer build puede tardar más porque EAS genera certificados

