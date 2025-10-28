# 📧 Configuración de Zoho Mail para Producción en Vercel

## 🚀 Pasos para Configurar Zoho Mail en admin.delfincheckin.com

### 1. **Configurar Aplicación en Zoho**

1. Ve a [Zoho API Console](https://api-console.zoho.com/)
2. Crea una nueva aplicación:
   - **Tipo**: Server-based Applications
   - **Nombre**: Delfin Check-in Production
   - **URL de redirección**: `https://admin.delfincheckin.com/auth/zoho/callback`
   - **Permisos**: `ZohoMail.messages.CREATE`

3. Guarda y copia:
   - **Client ID**
   - **Client Secret**

### 2. **Obtener Refresh Token**

1. Ejecuta el script de configuración:
   ```bash
   node scripts/get-zoho-refresh-token.js
   ```

2. Sigue las instrucciones para obtener el refresh token

### 3. **Configurar Variables de Entorno en Vercel**

Ve a tu proyecto en Vercel → Settings → Environment Variables y agrega:

```bash
# Zoho Mail API (Método Principal)
ZOHO_MAIL_API_URL=https://mail.zoho.com/api/accounts
ZOHO_CLIENT_ID=tu_client_id_aqui
ZOHO_CLIENT_SECRET=tu_client_secret_aqui
ZOHO_REFRESH_TOKEN=tu_refresh_token_aqui
ZOHO_FROM_EMAIL=tu_email@tudominio.com
ZOHO_FROM_NAME=Delfín Check-in

# SMTP como Backup (Método Alternativo)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=tu_email@tudominio.com
SMTP_PASSWORD=tu_contraseña_de_aplicacion_zoho
SMTP_FROM="Delfín Check-in <tu_email@tudominio.com>"

# Token para pruebas (opcional)
ADMIN_TEST_TOKEN=tu_token_secreto_para_pruebas
```

### 4. **Crear Contraseña de Aplicación en Zoho**

1. Ve a Zoho Mail → Configuración → Seguridad
2. Crea una "Contraseña de aplicación"
3. Usa esta contraseña en `SMTP_PASSWORD` (NO tu contraseña normal)

### 5. **Probar la Configuración**

#### **Opción A: Usar el endpoint de prueba**
```bash
curl -X POST https://admin.delfincheckin.com/api/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu_admin_test_token" \
  -d '{"email": "tu_email@ejemplo.com"}'
```

#### **Opción B: Probar desde la interfaz**
1. Ve a `https://admin.delfincheckin.com/forgot-password`
2. Introduce tu email
3. Revisa los logs de Vercel para ver si se envía correctamente

### 6. **Verificar Configuración**

```bash
curl https://admin.delfincheckin.com/api/test-email
```

Esto te mostrará el estado de la configuración sin enviar emails.

## 🔧 Solución de Problemas

### **Error: "No se pudo obtener access token"**
- Verifica que `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` y `ZOHO_REFRESH_TOKEN` estén correctos
- Asegúrate de que el refresh token no haya expirado

### **Error: "SMTP Authentication failed"**
- Usa una contraseña de aplicación, no tu contraseña normal
- Verifica que `SMTP_USER` sea tu email completo
- Asegúrate de que el puerto 587 esté abierto

### **Error: "Email simulado"**
- Ningún servicio de email está configurado correctamente
- Revisa todas las variables de entorno
- Verifica los logs de Vercel para más detalles

## 📊 Métodos de Envío (en orden de prioridad)

1. **Zoho Mail API** (más rápido, requiere OAuth)
2. **Resend** (más confiable, requiere API key)
3. **SMTP Directo** (más compatible, requiere credenciales SMTP)
4. **Simulado** (solo para desarrollo)

## ✅ Checklist de Configuración

- [ ] Aplicación creada en Zoho API Console
- [ ] Client ID y Client Secret obtenidos
- [ ] Refresh Token obtenido
- [ ] Variables de entorno configuradas en Vercel
- [ ] Contraseña de aplicación creada en Zoho
- [ ] Deploy realizado en Vercel
- [ ] Prueba de envío exitosa
- [ ] Verificación de logs en Vercel

## 🚨 Importante

- **NUNCA** uses tu contraseña normal de Zoho en `SMTP_PASSWORD`
- **SIEMPRE** usa contraseñas de aplicación para SMTP
- El **Refresh Token** es permanente, pero el Access Token expira
- Los emails se envían desde `ZOHO_FROM_EMAIL`
- Revisa los logs de Vercel si hay problemas
