# 🤖 Guía del Bot de Telegram - Sin Alucinaciones

## 🎯 Objetivo
Garantizar que el bot de Telegram muestre datos de reservas de forma consistente y sin inventar información.

## 🏗️ Arquitectura

### 1. **Backend Estructurado** (`/api/telegram/reservas`)
- **Lógica SQL precisa** con 3 consultas separadas
- **Filtrado exacto** por fechas (check_in, check_out)
- **Validación de campos** esenciales
- **Formato JSON consistente** sin ambigüedades

### 2. **IA Formateadora** (`/api/ai-reservas`)
- **GPT-4o-mini** con temperature=0 (determinista)
- **Prompt ultra-estricto** contra alucinaciones
- **Solo formatea** datos ya estructurados
- **No interpreta** ni inventa información

### 3. **Webhook Principal** (`/api/telegram/webhook`)
- **Procesa mensajes** de Telegram
- **Usa flujo completo** con IA estructurada
- **Respuestas consistentes** y precisas

## 📊 Formato de Datos

### Entrada (JSON estructurado):
```json
{
  "fecha_consulta": "2025-10-24",
  "alojados": [
    {
      "nombre": "María Pérez",
      "habitacion": "101",
      "personas": 2,
      "check_in": "2025-10-22",
      "check_out": "2025-10-27"
    }
  ],
  "llegan": [
    {
      "nombre": "Carlos Gómez",
      "habitacion": "103",
      "personas": 3,
      "check_in": "2025-10-24",
      "check_out": "2025-10-26"
    }
  ],
  "salen": [
    {
      "nombre": "Ana López",
      "habitacion": "102",
      "personas": 2,
      "check_in": "2025-10-21",
      "check_out": "2025-10-24"
    }
  ]
}
```

### Salida (Texto formateado):
```
📅 Estado de reservas para el 24/10/2025

🏠 Actualmente alojados:
- María Pérez (Hab. 101, 2 pers., Check-in 2025-10-22, Check-out 2025-10-27)

🟢 Llegadas de hoy:
- Carlos Gómez (Hab. 103, 3 pers., Check-in 2025-10-24, Check-out 2025-10-26)

🔴 Salidas de hoy:
- Ana López (Hab. 102, 2 pers., Check-in 2025-10-21, Check-out 2025-10-24)
```

## 🚀 Uso

### Comandos de Telegram:
- `/reservas` - Reservas de hoy
- `/reservas 2025-10-25` - Reservas de fecha específica
- `/estado` - Alias de /reservas
- `/help` - Ayuda

### API Endpoints:
```bash
# Obtener datos estructurados
GET /api/telegram/reservas?fecha=2025-10-24

# Procesar comando de bot
POST /api/telegram/bot
{
  "command": "reservas",
  "fecha": "2025-10-24"
}
```

## 🔒 Configuración Anti-Alucinaciones

### OpenAI (si se usa):
```javascript
{
  temperature: 0,           // Respuesta determinista
  response_format: { type: "text" },
  max_tokens: 1000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
}
```

### Reglas Estrictas:
1. ❌ NO inventar datos
2. ❌ NO mezclar grupos
3. ❌ NO añadir reservas
4. ❌ NO cambiar información
5. ✅ Solo formatear lo recibido

## 🧪 Testing

### Probar endpoint de datos:
```bash
curl -X GET "https://admin.delfincheckin.com/api/telegram/reservas?fecha=2025-10-24" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

### Probar webhook (simular mensaje de Telegram):
```bash
curl -X POST "https://admin.delfincheckin.com/api/telegram/webhook" \
  -H "Content-Type: application/json" \
  -d '{"message": {"chat": {"id": "123"}, "text": "Quién hay hoy?", "from": {"first_name": "Test"}}}'
```

## ✅ Beneficios

1. **Consistencia**: Mismo formato siempre
2. **Precisión**: Solo datos reales
3. **Confiabilidad**: Sin inventos ni errores
4. **Mantenibilidad**: Fácil de debuggear
5. **Escalabilidad**: Funciona con cualquier volumen de datos
