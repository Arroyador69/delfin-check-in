# 📋 Paso a Paso: Configuración iOS Completa

## ✅ Lo que YA tienes

- ✅ **Apple Team ID**: `_________________` (ya lo tienes)
- ✅ **Apple ID (Email)**: `_________________` (ya lo tienes)

## 📝 Lo que necesitas hacer ahora

### PASO 1: App-Specific Password (Opcional pero Recomendado)

**¿Para qué sirve?**
- Permite que EAS suba automáticamente tu app a TestFlight/App Store
- Sin esto, tendrás que subir manualmente cada build

**Cómo obtenerlo:**

1. Ve a: **https://appleid.apple.com**
2. Inicia sesión con tu Apple ID
3. Ve a **Sign-In and Security**
4. Busca la sección **App-Specific Passwords**
5. Haz clic en **Generate an app-specific password** o el botón **+**
6. **Nombre**: `EAS Build` (o cualquier nombre que quieras)
7. Haz clic en **Generate**
8. **IMPORTANTE**: Copia la contraseña inmediatamente (formato: `xxxx-xxxx-xxxx-xxxx`)
   - Solo se muestra UNA VEZ
   - Si la pierdes, tendrás que generar una nueva

**Tu App-Specific Password:** `_________________`

---

### PASO 2: Crear App ID en Apple Developer Portal

**¿Para qué sirve?**
- Identifica tu app de forma única
- Necesario para generar certificados y publicar

**Cómo hacerlo:**

1. Ve a: **https://developer.apple.com/account/resources/identifiers/list**
2. Haz clic en el botón **+** (arriba a la izquierda)
3. Selecciona **App IDs** → **Continue**
4. Selecciona **App** → **Continue**
5. Completa:
   - **Description**: `Delfín Check-in Owner App`
   - **Bundle ID**: Selecciona **Explicit** y escribe: `com.desarroyo.delfinowner`
6. En **Capabilities**, selecciona:
   - ✅ **Push Notifications** (si planeas usar notificaciones)
   - ✅ Otras que necesites (Background Modes, etc.)
7. Haz clic en **Continue**
8. Revisa la información → **Register**

**✅ Verificación:** Deberías ver `com.desarroyo.delfinowner` en la lista de App IDs

---

### PASO 3: Crear App en App Store Connect

**¿Para qué sirve?**
- Necesario para publicar en App Store
- Gestiona TestFlight, reviews, etc.

**Cómo hacerlo:**

1. Ve a: **https://appstoreconnect.apple.com**
2. Inicia sesión con tu Apple ID
3. Haz clic en **My Apps** → **+** → **New App**
4. Completa el formulario:
   - **Platform**: Selecciona **iOS**
   - **Name**: `Delfín Check-in`
   - **Primary Language**: **Spanish** (o el que prefieras)
   - **Bundle ID**: Selecciona `com.desarroyo.delfinowner` (debe aparecer si creaste el App ID)
   - **SKU**: `delfin-owner-app` (cualquier identificador único, no visible para usuarios)
   - **User Access**: **Full Access** (si eres el único desarrollador)
5. Haz clic en **Create**

**✅ Verificación:** Deberías ver tu app en la lista de "My Apps"

**Obtener App Store Connect App ID:**
- Una vez creada la app, ve a **App Information** → **General Information**
- Verás **Apple ID**: `1234567890` (número)
- **Cópialo**: `_________________`

---

### PASO 4: Configurar EAS (Expo Application Services)

**4.1 Login en Expo**

```bash
cd delfin-owner-app
npx expo login
```

- Si no tienes cuenta Expo, créala en: https://expo.dev/signup
- Es gratis y necesaria para usar EAS

**4.2 Inicializar EAS**

```bash
npx eas init
```

- Te preguntará si quieres crear un nuevo proyecto EAS → **Yes**
- Esto generará un `EAS_PROJECT_ID` y lo agregará a `app.config.ts`

**4.3 Configurar Credenciales**

```bash
npx eas credentials
```

**Sigue estos pasos:**

1. Selecciona: **iOS**
2. Selecciona: **Build credentials** (para generar builds)
3. Te preguntará:
   - **Apple ID**: Pega tu email de Apple Developer
   - **Password**: Pega tu **App-Specific Password** (la que generaste en PASO 1)
   - **Team ID**: Pega tu **Apple Team ID**
4. EAS generará automáticamente:
   - Certificados de desarrollo
   - Certificados de distribución
   - Provisioning profiles

**✅ Verificación:** Deberías ver "Credentials configured successfully"

**4.4 Configurar Submit Credentials (Opcional - para submit automático)**

```bash
npx eas credentials
```

1. Selecciona: **iOS**
2. Selecciona: **Submit credentials** (para subir a App Store)
3. Te preguntará:
   - **Apple ID**: Tu email
   - **App-Specific Password**: La que generaste
   - **App Store Connect App ID**: El número que copiaste en PASO 3
   - **Team ID**: Tu Team ID

---

### PASO 5: Verificar Configuración

**Ver credenciales configuradas:**

```bash
npx eas credentials
```

Deberías ver:
- ✅ Build credentials configuradas
- ✅ Submit credentials configuradas (si las configuraste)

**Ver proyecto EAS:**

```bash
npx eas whoami
```

Deberías ver tu usuario de Expo.

---

### PASO 6: Generar Primer Build de Prueba

**6.1 Asegúrate de estar en staging branch:**

```bash
git checkout staging
```

**6.2 Generar build para TestFlight:**

```bash
npx eas build -p ios --profile preview
```

**Esto hará:**
- Generar un build en los servidores de EAS
- Tardará ~15-20 minutos
- Te dará un link para seguir el progreso
- Al terminar, aparecerá automáticamente en App Store Connect → TestFlight

**6.3 Ver estado del build:**

```bash
npx eas build:list
```

O ve al dashboard de EAS: https://expo.dev

---

### PASO 7: Subir a TestFlight (Si no configuraste submit automático)

Si configuraste submit credentials en el PASO 4.4, esto se hace automáticamente.

Si no, hazlo manualmente:

```bash
npx eas submit -p ios --latest
```

O sube manualmente desde App Store Connect:
1. Ve a tu app en App Store Connect
2. **TestFlight** tab
3. Espera a que el build se procese (10-30 min)
4. Una vez procesado, puedes agregar testers

---

## 📊 Resumen de Credenciales

| Credencial | Estado | Dónde está |
|------------|--------|------------|
| **Apple Team ID** | ✅ Ya lo tienes | `_________________` |
| **Apple ID (Email)** | ✅ Ya lo tienes | `_________________` |
| **App-Specific Password** | ⏳ PASO 1 | `_________________` |
| **App ID creado** | ⏳ PASO 2 | Apple Developer Portal |
| **App Store Connect App** | ⏳ PASO 3 | App Store Connect |
| **App Store Connect App ID** | ⏳ PASO 3 | `_________________` |
| **EAS configurado** | ⏳ PASO 4 | EAS Dashboard |

---

## 🎯 Checklist Final

- [ ] **PASO 1**: App-Specific Password generado
- [ ] **PASO 2**: App ID creado en Apple Developer Portal
- [ ] **PASO 3**: App creada en App Store Connect
- [ ] **PASO 4**: EAS inicializado y credenciales configuradas
- [ ] **PASO 5**: Configuración verificada
- [ ] **PASO 6**: Primer build generado
- [ ] **PASO 7**: Build subido a TestFlight

---

## ⚠️ Notas Importantes

1. **Bundle ID**: Debe ser exactamente `com.desarroyo.delfinowner` en:
   - Apple Developer Portal (App ID)
   - App Store Connect (al crear la app)
   - `app.config.ts` (ya está configurado ✅)

2. **Certificados**: EAS los genera automáticamente, NO necesitas crearlos manualmente.

3. **Primera vez**: El primer build puede tardar más porque EAS genera certificados.

4. **TestFlight**: Los builds de `preview` van automáticamente a TestFlight si configuraste submit credentials.

---

## 🔗 Enlaces Directos

- **Apple Developer Portal**: https://developer.apple.com/account
- **Apple ID Settings**: https://appleid.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Dashboard**: https://expo.dev
- **Expo Signup**: https://expo.dev/signup

---

## 💡 Tips

- **Guarda todas las credenciales** en un lugar seguro (1Password, LastPass, etc.)
- **App-Specific Password**: Si la pierdes, genera una nueva, no hay problema
- **Primer build**: Puede tardar 20-30 minutos, es normal
- **TestFlight**: Los builds tardan 10-30 minutos en procesarse después de subirse

