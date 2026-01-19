# 🤖 Configuración de Reportes Automáticos por Telegram

Este documento explica cómo configurar las notificaciones automáticas de Telegram para recibir reportes diarios y semanales de la waitlist.

---

## 📋 Resumen de Funcionalidades

### Reporte Diario (Lunes a Domingo, 8:00 AM)
- **Horario:** Todos los días a las 8:00 AM hora española
- **Contenido:**
  - Número de nuevos registros en las últimas 24 horas
  - Total acumulado en la waitlist
  - Lista detallada de cada nuevo registro:
    - Nombre
    - Email
    - Fuente de origen (landing, artículo #1, artículo #2, etc.)
    - Hora de registro

### Reporte Semanal (Domingos, 8:00 AM)
- **Horario:** Cada domingo a las 8:00 AM hora española
- **Contenido:**
  - Número de nuevos registros en la última semana
  - Total acumulado en la waitlist
  - Desglose día por día de los últimos 7 días
  - Top 5 fuentes de origen más productivas

---

## 🚀 PASO 1: Crear Bot de Telegram

### 1.1 Abrir BotFather
1. Abre Telegram en tu móvil o escritorio
2. Busca: `@BotFather`
3. Inicia conversación haciendo clic en "Start"

### 1.2 Crear el bot
Envía este comando:
```
/newbot
```

### 1.3 Elegir nombre del bot
Cuando te pregunte el nombre, envía:
```
Delfín Check-in Notificaciones
```

### 1.4 Elegir username (debe terminar en "bot")
Cuando te pregunte el username, envía algo como:
```
delfincheckin_notif_bot
```
*(Si está ocupado, prueba: `delfincheckin_reports_bot` o `delfincheckin_waitlist_bot`)*

### 1.5 Guardar el TOKEN
BotFather te dará un mensaje con el **TOKEN** del bot. Se verá así:
```
7123456789:AAHdqTcvCH1vGEMyIrdq2bP8v5r3uL4sW7A
```

**🔴 IMPORTANTE:** Guarda este TOKEN, lo necesitarás más adelante.

---

## 📱 PASO 2: Obtener tu CHAT_ID

### 2.1 Iniciar conversación con tu bot
1. Busca tu bot en Telegram por el username que elegiste (ej: `@delfincheckin_notif_bot`)
2. Haz clic en "Start"
3. Envíale cualquier mensaje (por ejemplo: "Hola")

### 2.2 Obtener el CHAT_ID
1. Abre en tu navegador esta URL (reemplaza `<TU_TOKEN>` con el token del paso 1.5):
```
https://api.telegram.org/bot<TU_TOKEN>/getUpdates
```

Ejemplo:
```
https://api.telegram.org/bot7123456789:AAHdqTcvCH1vGEMyIrdq2bP8v5r3uL4sW7A/getUpdates
```

2. Busca en la respuesta JSON algo como:
```json
{
  "chat": {
    "id": 123456789,
    "first_name": "Alberto",
    ...
  }
}
```

3. El número del campo `"id"` es tu **CHAT_ID** (puede ser positivo o negativo)

**Ejemplo:** `123456789` o `-987654321`

**🔴 IMPORTANTE:** Guarda este CHAT_ID, lo necesitarás más adelante.

---

## 🔧 PASO 3: Configurar Variables de Entorno en Vercel

### 3.1 Ir a Vercel Dashboard
1. Ve a https://vercel.com
2. Selecciona tu proyecto: `delfin-check-in`
3. Ve a la pestaña **"Settings"**
4. En el menú lateral, haz clic en **"Environment Variables"**

### 3.2 Agregar Variables

Agrega estas **3 variables nuevas**:

#### Variable 1: TELEGRAM_BOT_TOKEN
- **Name:** `TELEGRAM_BOT_TOKEN`
- **Value:** El token que te dio BotFather (ej: `7123456789:AAHdqTcvCH1vGEMyIrdq2bP8v5r3uL4sW7A`)
- **Environments:** Marca **Production**, **Preview** y **Development**
- Haz clic en **"Save"**

#### Variable 2: TELEGRAM_CHAT_ID
- **Name:** `TELEGRAM_CHAT_ID`
- **Value:** Tu chat_id (ej: `123456789`)
- **Environments:** Marca **Production**, **Preview** y **Development**
- Haz clic en **"Save"**

#### Variable 3: CRON_SECRET
- **Name:** `CRON_SECRET`
- **Value:** Genera un string aleatorio seguro. Puedes usar este comando en tu terminal:
```bash
openssl rand -hex 32
```
O simplemente escribe algo como: `mi_super_secret_cron_key_2026_delfin`
- **Environments:** Marca **Production**, **Preview** y **Development**
- Haz clic en **"Save"**

---

## 🚀 PASO 4: Desplegar Cambios

### 4.1 Verificar que todo esté en GitHub
Los archivos ya están listos para hacer commit:
- `src/lib/telegram.ts` ✅
- `src/app/api/cron/daily-report/route.ts` ✅
- `src/app/api/cron/weekly-report/route.ts` ✅
- `vercel.json` (actualizado) ✅

### 4.2 Hacer commit y push
Ejecuta en tu terminal:
```bash
cd "/Users/albertogarciaarroyo/Delfín Check‑in 🐬/delfin-checkin"
git add .
git commit -m "feat: notificaciones automáticas de Telegram para waitlist"
git push origin main
```

### 4.3 Esperar despliegue en Vercel
- Ve a https://vercel.com/dashboard
- Verás un nuevo deployment en progreso
- Espera a que termine (generalmente 2-3 minutos)

---

## ✅ PASO 5: Verificar Configuración

### 5.1 Verificar Cron Jobs en Vercel
1. Ve a tu proyecto en Vercel
2. En el menú lateral, haz clic en **"Cron Jobs"**
3. Deberías ver **3 cron jobs**:
   - `Programmatic Cron` - Corre a las 9:00 y 17:00 UTC
   - **`Daily Report`** - Corre a las 07:00 UTC (8:00 AM España) todos los días
   - **`Weekly Report`** - Corre a las 07:00 UTC (8:00 AM España) cada domingo

### 5.2 Probar manualmente los endpoints

#### Probar Reporte Diario
Abre en tu navegador (reemplaza `<CRON_SECRET>` con tu valor):
```
https://admin.delfincheckin.com/api/cron/daily-report
```
Agrega en las Headers (puedes usar Postman o cURL):
```
Authorization: Bearer <CRON_SECRET>
```

Ejemplo con cURL:
```bash
curl -H "Authorization: Bearer mi_super_secret_cron_key_2026_delfin" \
  https://admin.delfincheckin.com/api/cron/daily-report
```

**Resultado esperado:** Deberías recibir un mensaje en Telegram con el resumen diario.

#### Probar Reporte Semanal
```bash
curl -H "Authorization: Bearer mi_super_secret_cron_key_2026_delfin" \
  https://admin.delfincheckin.com/api/cron/weekly-report
```

**Resultado esperado:** Deberías recibir un mensaje en Telegram con el resumen semanal.

---

## 📅 Horarios Configurados

| Reporte | Frecuencia | Hora (España) | Hora (UTC) | Días |
|---------|-----------|---------------|------------|------|
| **Diario** | Todos los días | 8:00 AM | 07:00 | Lunes a Domingo |
| **Semanal** | Cada domingo | 8:00 AM | 07:00 | Solo Domingos |

**Nota:** Los horarios son aproximados. Vercel ejecuta los cron jobs con una tolerancia de ±1 minuto.

---

## 📨 Ejemplo de Mensajes

### Reporte Diario
```
🐬 Delfín Check-in - Resumen Diario

📅 Fecha: lunes, 20 de enero de 2026

📊 Estadísticas:
• Nuevos registros ayer: 5
• Total en waitlist: 237

✨ Nuevos Registros:

1. Juan Pérez
   📧 juan@example.com
   📍 Origen: article:multas-por-no-registrar-viajeros-espana
   ⏰ 14:32

2. María García
   📧 maria@example.com
   📍 Origen: landing
   ⏰ 18:45

[...]

━━━━━━━━━━━━━━━━━━
🔗 Ver Dashboard Completo
```

### Reporte Semanal
```
🐬 Delfín Check-in - Resumen Semanal

📅 Semana del: 13/01/2026 - 20/01/2026

📊 Estadísticas Generales:
• Nuevos registros esta semana: 34
• Total en waitlist: 237

📈 Registros por Día:
lun, 13 ene: ████ 8
mar, 14 ene: ██ 4
mié, 15 ene: ███████ 14
jue, 16 ene: █ 2
vie, 17 ene: ██ 3
sáb, 18 ene: █ 1
dom, 19 ene: █ 2

🎯 Top Fuentes:
1. landing: 18 registros
2. article:multas-por-no-registrar-viajeros-espana: 10 registros
3. article:errores-frecuentes-enviar-datos-huespedes-ses: 6 registros

━━━━━━━━━━━━━━━━━━
🔗 Ver Dashboard Completo
```

---

## 🔧 Troubleshooting

### No recibo mensajes
1. **Verifica las variables de entorno:**
   - Ve a Vercel → Settings → Environment Variables
   - Confirma que `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` y `CRON_SECRET` están configuradas
   - Confirma que están en **Production**

2. **Verifica el bot:**
   - Asegúrate de haber iniciado conversación con el bot
   - Envía `/start` al bot

3. **Verifica los logs:**
   - Ve a Vercel → tu proyecto → Deployments
   - Haz clic en el último deployment
   - Ve a "Functions" y busca los logs de `/api/cron/daily-report`

### Los horarios no coinciden
- Los cron jobs se ejecutan en UTC (07:00 UTC = 8:00 AM España en invierno)
- En verano (CEST), serán las 9:00 AM
- Para ajustar, edita `vercel.json` y cambia el horario

### Quiero cambiar el horario
Edita el archivo `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 7 * * *"  // Cambia "7" por la hora UTC que quieras
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 7 * * 0"  // Cambia "7" por la hora UTC que quieras
    }
  ]
}
```

**Formato de schedule:** `minute hour day month weekday`
- `0 7 * * *` = Todos los días a las 07:00 UTC
- `0 7 * * 0` = Cada domingo a las 07:00 UTC

---

## 🎯 Resumen de lo que NO necesitas

❌ **NO necesitas IA** - Los reportes son consultas directas a la base de datos
❌ **NO necesitas servidor adicional** - Todo corre en Vercel automáticamente
❌ **NO necesitas pagos en Telegram** - El bot es completamente gratis
❌ **NO necesitas mantener nada corriendo** - Vercel ejecuta los cron jobs automáticamente

---

## ✅ Checklist Final

- [ ] Bot de Telegram creado con BotFather
- [ ] TOKEN del bot guardado
- [ ] CHAT_ID obtenido
- [ ] Variables de entorno configuradas en Vercel:
  - [ ] `TELEGRAM_BOT_TOKEN`
  - [ ] `TELEGRAM_CHAT_ID`
  - [ ] `CRON_SECRET`
- [ ] Código desplegado en Vercel (push a main)
- [ ] Cron jobs visibles en Vercel Dashboard
- [ ] Prueba manual exitosa (recibiste mensaje en Telegram)

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel
2. Verifica las variables de entorno
3. Prueba los endpoints manualmente con cURL
4. Revisa que el bot esté activo en Telegram

---

**¡Listo! Ahora recibirás reportes automáticos todos los días a las 8:00 AM y resúmenes semanales cada domingo.** 🎉
