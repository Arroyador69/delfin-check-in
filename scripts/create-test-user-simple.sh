#!/bin/bash

# =====================================================
# SCRIPT SIMPLE: Crear usuario de prueba para AppConnect
# =====================================================
# Este script intenta crear el usuario usando el endpoint API
# que no requiere acceso directo a la base de datos

API_URL="${API_URL:-https://admin.delfincheckin.com}"
TEST_EMAIL="appconnect-test@delfincheckin.com"
TEST_PASSWORD="AppConnect2024!"
TEST_ROLE="owner"

echo "🔍 Creando usuario de prueba para AppConnect..."
echo "🌐 API URL: $API_URL"
echo ""

# Necesitas proporcionar un TENANT_ID
if [ -z "$TENANT_ID" ]; then
  echo "❌ Error: TENANT_ID no está definido"
  echo ""
  echo "💡 OPCIONES:"
  echo ""
  echo "1. Si tienes acceso al admin panel:"
  echo "   - Inicia sesión en $API_URL"
  echo "   - Ve a Settings o cualquier página que muestre tu tenant_id"
  echo "   - Copia el UUID del tenant"
  echo ""
  echo "2. Si tienes DATABASE_URL de Neon:"
  echo "   - Ejecuta: DATABASE_URL=\"...\" node scripts/create-test-user.js"
  echo ""
  echo "3. Ejecuta este script con:"
  echo "   TENANT_ID=\"uuid-del-tenant\" ./scripts/create-test-user-simple.sh"
  echo ""
  exit 1
fi

echo "📡 Creando usuario mediante API..."
echo "🏢 Tenant ID: $TENANT_ID"
echo ""

# Hacer la petición al API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/admin/create-tenant-user" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"role\": \"$TEST_ROLE\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo ""
  echo "============================================================"
  echo "✅ USUARIO DE PRUEBA CREADO EXITOSAMENTE"
  echo "============================================================"
  echo "📧 Email: $TEST_EMAIL"
  echo "🔑 Contraseña: $TEST_PASSWORD"
  echo "👤 Rol: $TEST_ROLE"
  echo "============================================================"
  echo ""
  echo "💡 Comparte estas credenciales con el equipo de AppConnect"
  echo "   para que puedan probar la aplicación móvil."
  echo ""
elif [ "$HTTP_CODE" = "409" ]; then
  echo "⚠️  El usuario ya existe."
  echo "💡 Usa el script create-test-user.js para actualizar la contraseña."
else
  echo "❌ Error creando usuario (HTTP $HTTP_CODE):"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi

