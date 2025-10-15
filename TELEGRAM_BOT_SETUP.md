# 🤖 TELEGRAM BOT - GUÍA COMPLETA DE SETUP

## 📋 ÍNDICE
1. [Descripción](#descripción)
2. [Requisitos previos](#requisitos-previos)
3. [Paso 1: Crear el bot](#paso-1-crear-el-bot-en-telegram)
4. [Paso 2: Configurar variables de entorno](#paso-2-configurar-variables-de-entorno)
5. [Paso 3: Migrar la base de datos](#paso-3-migrar-la-base-de-datos)
6. [Paso 4: Deploy a Vercel](#paso-4-deploy-a-vercel)
7. [Paso 5: Configurar webhook](#paso-5-configurar-webhook-de-telegram)
8. [Paso 6: Activar tenant](#paso-6-activar-telegram-para-un-tenant)
9. [Uso del bot](#uso-del-bot)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 DESCRIPCIÓN

El bot de Telegram de Delfín Check-in permite a cada propietario (tenant) consultar sus datos de forma natural usando IA (GPT-4o-mini).

### Características:
- ✅ **Multitenant**: Cada cliente tiene su propio bot aislado
- ✅ **IA Natural**: Responde preguntas en lenguaje natural
- ✅ **Datos en tiempo real**: Conectado a tu base de datos Neon
- ✅ **Control de uso**: Límites configurables de tokens de IA por tenant
- ✅ **Seguro**: Autenticación por chat_id de Telegram
- ✅ **Serverless**: Desplegado en Vercel, siempre disponible

### Ejemplo de uso:
```
👤 Usuario: "¿Adrián rellenó el formulario?"
🤖 Bot: "Sí, Adrián completó el registro el 12/01/2025 a las 14:30. 
       Reserva #ABC123, habitación 101, entrada 15/01, salida 17/01 ✅"
```

---

## 🔧 REQUISITOS PREVIOS

1. ✅ **Cuenta de Telegram**
2. ✅ **Proyecto Next.js desplegado en Vercel**
3. ✅ **Base de datos Neon configurada**
4. ✅ **API Key de OpenAI** (para GPT-4o-mini)

---

## 📝 PASO 1: CREAR EL BOT EN TELEGRAM

1. Abre Telegram
2. Busca **@BotFather**
3. Escribe `/newbot`
4. Nombre del bot: **Delfín Check-in Assistant** (o el que prefieras)
5. Username: **delfin_checkin_bot** (debe terminar en `_bot`)
6. BotFather te dará un **TOKEN**:
   ```
   1234567890:ABCDefGhIjKlMnOpQrStUvWxYz
   ```
7. **GUARDA ESE TOKEN** ⚠️ Lo necesitarás en el siguiente paso

---

## 🔐 PASO 2: CONFIGURAR VARIABLES DE ENTORNO

### En Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega estas variables:

```bash
# OpenAI (para GPT-4o-mini)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx

# Telegram Bot
TELEGRAM_TOKEN=1234567890:ABCDefGhIjKlMnOpQrStUvWxYz

# Database Neon (ya deberías tenerlo)
POSTGRES_URL=postgresql://user:password@ep-xxxxx.neon.tech/delfin_checkin
```

### Localmente (archivo `.env.local`):

```bash
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx

# Telegram
TELEGRAM_TOKEN=1234567890:ABCDefGhIjKlMnOpQrStUvWxYz

# Database Neon
POSTGRES_URL=postgresql://user:password@ep-xxxxx.neon.tech/delfin_checkin
```

---

## 🗄️ PASO 3: MIGRAR LA BASE DE DATOS

Ejecuta el script SQL para agregar las columnas necesarias a tu tabla `tenants`:

### Opción A: Desde Neon Dashboard

1. Ve a tu proyecto en [Neon](https://console.neon.tech)
2. Abre el SQL Editor
3. Copia y pega el contenido de `database/telegram-bot.sql`
4. Ejecuta

### Opción B: Desde terminal con `psql`

```bash
cd delfin-checkin
psql $POSTGRES_URL < database/telegram-bot.sql
```

### Qué hace este script:

- Agrega columnas a `tenants`:
  - `telegram_chat_id` - ID del chat de Telegram
  - `ai_tokens_used` - Tokens consumidos
  - `ai_token_limit` - Límite mensual de tokens
  - `telegram_enabled` - Indica si el bot está activo

- Crea tabla `telegram_interactions` para registrar conversaciones
- Crea vista `tenant_ai_usage` para monitorear uso

---

## 🚀 PASO 4: DEPLOY A VERCEL

1. Haz commit de los cambios:
   ```bash
   cd delfin-checkin
   git add .
   git commit -m "feat: Telegram bot integration with GPT-4o-mini"
   git push origin main
   ```

2. Vercel desplegará automáticamente

3. Verifica que el endpoint esté funcionando:
   ```bash
   curl https://tu-app.vercel.app/api/telegram/webhook
   ```

   Deberías ver:
   ```json
   {
     "status": "ok",
     "message": "Telegram webhook endpoint is ready",
     "timestamp": "2025-01-13T..."
   }
   ```

---

## 🔗 PASO 5: CONFIGURAR WEBHOOK DE TELEGRAM

Conecta el bot de Telegram con tu API en Vercel:

### Método 1: Desde el navegador

Abre esta URL (reemplaza los valores):

```
https://api.telegram.org/bot<TU_TELEGRAM_TOKEN>/setWebhook?url=https://tu-app.vercel.app/api/telegram/webhook
```

Ejemplo:
```
https://api.telegram.org/bot1234567890:ABCDefGhIjKlMnOpQrStUvWxYz/setWebhook?url=https://delfin-checkin.vercel.app/api/telegram/webhook
```

### Método 2: Desde terminal con curl

```bash
curl -X POST "https://api.telegram.org/bot<TU_TELEGRAM_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tu-app.vercel.app/api/telegram/webhook"}'
```

### Respuesta exitosa:

```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Verificar webhook:

```bash
curl "https://api.telegram.org/bot<TU_TELEGRAM_TOKEN>/getWebhookInfo"
```

---

## 👤 PASO 6: ACTIVAR TELEGRAM PARA UN TENANT

### 6.1 Obtener tu Chat ID

1. Abre Telegram
2. Inicia conversación con tu bot (búscalo por el username que creaste)
3. Escribe `/start`
4. El bot te responderá con tu `chat_id`:
   ```
   🔒 No estás registrado
   
   Tu chat ID es: 123456789
   
   Por favor, contacta con el administrador...
   ```
5. **Copia ese número**

### 6.2 Activar el tenant en la base de datos

#### Opción A: Con API (recomendado)

```bash
curl -X POST "https://tu-app.vercel.app/api/telegram/setup" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "chatId": "123456789",
    "tokenLimit": 100000
  }'
```

#### Opción B: SQL directo

```sql
UPDATE tenants 
SET 
  telegram_chat_id = '123456789',
  telegram_enabled = true,
  ai_token_limit = 100000
WHERE id = 1;  -- ID de tu tenant
```

### 6.3 Verificar activación

```bash
curl "https://tu-app.vercel.app/api/telegram/setup?tenantId=1"
```

---

## 💬 USO DEL BOT

Una vez activado, puedes usar el bot:

### Comandos:

- `/start` - Iniciar el bot y ver bienvenida
- `/help` - Ver ayuda y comandos disponibles
- `/stats` - Ver estadísticas de uso de IA

### Preguntas en lenguaje natural:

```
👤 "¿Adrián rellenó el formulario?"
👤 "¿Cuántas reservas tengo hoy?"
👤 "Muéstrame los últimos registros"
👤 "¿Hay algún check-in para mañana?"
👤 "¿Quién llega el viernes?"
```

El bot analizará tus datos y responderá de forma natural 🤖

---

## 🏢 CONFIGURACIÓN MULTITENANT

### Para cada cliente nuevo:

1. Crea el tenant en la base de datos (si no existe):
   ```sql
   INSERT INTO tenants (name, email, subscription_status)
   VALUES ('Hotel Example', 'hotel@example.com', 'active');
   ```

2. El cliente inicia conversación con el bot y obtiene su `chat_id`

3. Activas Telegram para ese tenant:
   ```bash
   curl -X POST "https://tu-app.vercel.app/api/telegram/setup" \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": 2,
       "chatId": "987654321",
       "tokenLimit": 50000
     }'
   ```

4. ¡Listo! Ese cliente ya puede usar el bot con sus propios datos

---

## 🎛️ GESTIÓN DE LÍMITES DE IA

### Ver uso actual:

```sql
SELECT * FROM tenant_ai_usage;
```

### Aumentar límite:

```sql
UPDATE tenants 
SET ai_token_limit = 200000
WHERE id = 1;
```

### Resetear contador (cada mes):

```sql
UPDATE tenants 
SET ai_tokens_used = 0
WHERE telegram_enabled = true;
```

### Desactivar Telegram:

```sql
UPDATE tenants 
SET telegram_enabled = false
WHERE id = 1;
```

---

## 🐛 TROUBLESHOOTING

### El bot no responde

1. Verifica el webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. Revisa los logs en Vercel:
   - Ve a tu proyecto → Deployments → Logs

3. Verifica las variables de entorno en Vercel

### Error "No estás registrado"

- Asegúrate de que el `telegram_chat_id` en la BD coincide con tu chat_id
- Verifica que `telegram_enabled = true`

### Error "Límite de IA alcanzado"

- Revisa el uso con `/stats`
- Aumenta el límite en la BD:
  ```sql
  UPDATE tenants SET ai_token_limit = 200000 WHERE id = 1;
  ```

### El bot responde con datos de otro cliente

- **PROBLEMA CRÍTICO**: Revisa la query que filtra por `tenant_id`
- Verifica que el `chat_id` esté correctamente asociado al tenant correcto

---

## 📊 MONITOREO

### Ver todas las interacciones:

```sql
SELECT 
  t.name,
  ti.user_message,
  ti.bot_response,
  ti.tokens_used,
  ti.created_at
FROM telegram_interactions ti
JOIN tenants t ON ti.tenant_id = t.id
ORDER BY ti.created_at DESC
LIMIT 20;
```

### Ver uso de tokens por cliente:

```sql
SELECT * FROM tenant_ai_usage ORDER BY usage_percentage DESC;
```

---

## 🎉 ¡LISTO!

Tu bot de Telegram está completamente configurado y funcionando. Cada cliente puede:

- ✅ Consultar sus registros de viajeros
- ✅ Ver sus reservas
- ✅ Hacer preguntas en lenguaje natural
- ✅ Recibir respuestas inteligentes generadas por IA

**Todo de forma segura, multitenant y escalable** 🚀

