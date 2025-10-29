# 📧 Configuración de Emails en Zoho Mail

## 🎯 Objetivo

Configurar dos remitentes diferentes para evitar confusión:
- **noreply@delfincheckin.com** → Para emails de onboarding (propietarios)
- **booking@delfincheckin.com** → Para emails de reservas (huéspedes)

## 📋 Paso 1: Crear booking@delfincheckin.com en Zoho Mail

### Opción A: Crear un alias (Recomendado - Más simple)

Si ya tienes una cuenta principal en Zoho Mail (por ejemplo, `admin@delfincheckin.com`):

1. **Inicia sesión** en [Zoho Mail](https://mail.zoho.com/)
2. Ve a **Configuración** (⚙️) → **Cuenta** → **Alias de email**
3. Haz clic en **"Añadir alias"**
4. Ingresa: `booking@delfincheckin.com`
5. Haz clic en **"Añadir"**
6. Verifica que el alias esté activo

**Ventajas:**
- ✅ No necesitas crear una cuenta nueva
- ✅ Los emails se envían desde la misma cuenta
- ✅ Más fácil de gestionar

### Opción B: Crear una cuenta nueva

Si prefieres tener una cuenta completamente separada:

1. **Inicia sesión** en [Zoho Mail Admin Console](https://admin.zoho.com/)
2. Ve a **Usuarios** → **Añadir usuario**
3. Crea un nuevo usuario con el email: `booking@delfincheckin.com`
4. Establece una contraseña segura
5. Guarda las credenciales

**Nota:** Si eliges esta opción, necesitarás crear una contraseña de aplicación separada para SMTP.

## 📋 Paso 2: Verificar dominio en Zoho

Asegúrate de que tu dominio `delfincheckin.com` esté verificado en Zoho:

1. Ve a [Zoho Mail Admin](https://admin.zoho.com/)
2. Selecciona tu dominio `delfincheckin.com`
3. Verifica que esté **"Activo"** y **"Verificado"**
4. Si no está verificado, sigue las instrucciones de DNS

## 📋 Paso 3: Crear contraseñas de aplicación

### Para noreply@delfincheckin.com (o tu cuenta principal)

1. Inicia sesión en [Zoho Mail](https://mail.zoho.com/)
2. Ve a **Configuración** → **Seguridad** → **Contraseñas de aplicación**
3. Haz clic en **"Generar nueva contraseña"**
4. Nombre: `Delfin Check-in SMTP Onboarding`
5. Copia la contraseña generada (la necesitarás para `SMTP_PASSWORD`)

### Para booking@delfincheckin.com

Si creaste una cuenta nueva:
1. Inicia sesión con `booking@delfincheckin.com`
2. Repite el proceso anterior
3. Crea: `Delfin Check-in SMTP Booking`

Si usaste un alias:
- **Usa la misma contraseña de aplicación** de tu cuenta principal
- Ambos alias comparten las mismas credenciales SMTP

## 📋 Paso 4: Configurar variables de entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y configura:

```bash
# ═══════════════════════════════════════════════════════════════
# 📧 CONFIGURACIÓN ZOHO MAIL (API - Método Principal)
# ═══════════════════════════════════════════════════════════════
ZOHO_MAIL_API_URL=https://mail.zoho.com/api/accounts
ZOHO_CLIENT_ID=tu_client_id_aqui
ZOHO_CLIENT_SECRET=tu_client_secret_aqui
ZOHO_REFRESH_TOKEN=tu_refresh_token_aqui
ZOHO_FROM_EMAIL=noreply@delfincheckin.com
ZOHO_FROM_NAME=Delfín Check-in

# ═══════════════════════════════════════════════════════════════
# 📧 CONFIGURACIÓN SMTP (Backup - Para ambos emails)
# ═══════════════════════════════════════════════════════════════
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=tu_email_principal@delfincheckin.com
SMTP_PASSWORD=tu_contraseña_de_aplicacion_zoho

# ═══════════════════════════════════════════════════════════════
# 📧 REMITENTES ESPECÍFICOS POR WORKFLOW
# ═══════════════════════════════════════════════════════════════
# Email para onboarding de propietarios (admin.delfincheckin.com)
SMTP_FROM_ONBOARDING="Delfín Check-in <noreply@delfincheckin.com>"

# Email para reservas directas (book.delfincheckin.com)
SMTP_FROM_BOOKING="Delfín Check-in <booking@delfincheckin.com>"

# ═══════════════════════════════════════════════════════════════
# 📧 BACKUP (Opcional - Si SMTP falla)
# ═══════════════════════════════════════════════════════════════
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ✅ Verificación

### Verificar que los emails están configurados:

1. **Revisa los logs en Vercel** después de hacer un deploy
2. **Prueba el onboarding:**
   - Completa una compra de suscripción
   - Verifica que el email llegue desde `noreply@delfincheckin.com`
3. **Prueba las reservas:**
   - Completa una reserva directa
   - Verifica que el email llegue desde `booking@delfincheckin.com`

### Usar el endpoint de prueba:

```bash
# Ver configuración actual
curl https://admin.delfincheckin.com/api/email/test
```

## 🔧 Solución de problemas

### Error: "Email no autorizado para enviar desde este remitente"

**Causa:** El alias o cuenta no está correctamente configurado en Zoho.

**Solución:**
1. Verifica que el alias esté activo en Zoho Mail
2. Si usas cuenta nueva, asegúrate de que `SMTP_USER` use el email completo
3. Verifica que la contraseña de aplicación sea correcta

### Error: "SMTP Authentication failed"

**Causa:** Credenciales SMTP incorrectas.

**Solución:**
1. Asegúrate de usar una **contraseña de aplicación**, no tu contraseña normal
2. Verifica que `SMTP_USER` sea el email principal (no el alias)
3. Si usas alias, `SMTP_USER` debe ser tu cuenta principal, pero puedes enviar desde el alias usando `SMTP_FROM_*`

### Los emails llegan pero desde el remitente incorrecto

**Causa:** Las variables `SMTP_FROM_ONBOARDING` o `SMTP_FROM_BOOKING` no están configuradas.

**Solución:**
1. Verifica que ambas variables estén configuradas en Vercel
2. Haz un nuevo deploy después de agregar las variables
3. Revisa los logs para confirmar qué remitente se está usando

## 📝 Notas importantes

- ✅ **Los alias funcionan con las credenciales SMTP de la cuenta principal**
- ✅ **Puedes enviar desde cualquier alias usando `SMTP_FROM_*`**
- ✅ **Recomendado:** Usa alias en lugar de cuentas nuevas (más simple)
- ⚠️ **Importante:** Siempre usa contraseñas de aplicación, nunca contraseñas normales
- ⚠️ **Seguridad:** No compartas tus contraseñas de aplicación públicamente

## 🎯 Flujo de emails en el sistema

### Onboarding (Propietarios)
```
Stripe Payment → Webhook → createTenantFromPayment()
→ sendOnboardingEmail()
→ Usa: SMTP_FROM_ONBOARDING (noreply@delfincheckin.com)
```

### Reservas (Huéspedes)
```
Stripe Payment → Webhook Direct Reservations → sendReservationEmails()
→ sendGuestConfirmationEmail()
→ Usa: SMTP_FROM_BOOKING (booking@delfincheckin.com)
```

## 📞 Soporte

Si tienes problemas, revisa:
1. Logs de Vercel
2. Configuración de DNS del dominio
3. Estado de los alias en Zoho Mail
4. Variables de entorno en Vercel

