#!/bin/bash

# ====================================
# SCRIPT PARA CONFIGURAR TELEGRAM WEBHOOK
# ====================================

set -e

echo "🤖 TELEGRAM BOT - CONFIGURACIÓN DE WEBHOOK"
echo "=========================================="
echo ""

# Verificar que se pasaron los argumentos
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Error: Faltan argumentos"
    echo ""
    echo "Uso:"
    echo "  ./scripts/setup-telegram-webhook.sh <TELEGRAM_TOKEN> <WEBHOOK_URL>"
    echo ""
    echo "Ejemplo:"
    echo "  ./scripts/setup-telegram-webhook.sh 1234567890:ABCDef https://delfin-checkin.vercel.app/api/telegram/webhook"
    echo ""
    exit 1
fi

TELEGRAM_TOKEN="$1"
WEBHOOK_URL="$2"

echo "📝 Configuración:"
echo "  Token: ${TELEGRAM_TOKEN:0:20}..."
echo "  Webhook URL: $WEBHOOK_URL"
echo ""

# Configurar webhook
echo "🔗 Configurando webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar webhook
echo "✅ Verificando webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo")

echo "$WEBHOOK_INFO" | python3 -m json.tool 2>/dev/null || echo "$WEBHOOK_INFO"
echo ""

# Verificar si fue exitoso
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ ¡Webhook configurado correctamente!"
    echo ""
    echo "🎉 Próximos pasos:"
    echo "  1. Abre Telegram"
    echo "  2. Busca tu bot"
    echo "  3. Escribe /start"
    echo "  4. Copia tu chat_id"
    echo "  5. Activa el tenant con ese chat_id"
    echo ""
else
    echo "❌ Error al configurar webhook"
    exit 1
fi

