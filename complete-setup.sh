#!/bin/bash

echo "🐬 Configuración completa de Delfín Check-in"
echo "============================================"

# Variables de Supabase
SUPABASE_URL="https://spdwjdrlemselkqbxaue.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZHdqZHJsZW1zZWxrcWJ4YXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTU0MzcsImV4cCI6MjA3MTE5MTQzN30.BzX55tzKeSGEL9D7wgJG4M-DCcmQ3K4fZjcHR-LMnAs"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZHdqZHJsZW1zZWxrcWJ4YXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYxNTQzNywiZXhwIjoyMDcxMTkxNDM3fQ.901_CnxU5pP60kFkMLsfXZhGooVeryu8X9k-eHX5xiI"

# Actualizar .env.local con todas las variables de Supabase
sed -i '' "s|your_supabase_url_here|$SUPABASE_URL|g" .env.local
sed -i '' "s|your_supabase_anon_key_here|$SUPABASE_ANON_KEY|g" .env.local
sed -i '' "s|your_supabase_service_role_key_here|$SUPABASE_SERVICE_ROLE_KEY|g" .env.local

echo "✅ Variables de Supabase configuradas:"
echo "   URL: $SUPABASE_URL"
echo "   Anon Key: ${SUPABASE_ANON_KEY:0:20}..."
echo "   Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# Verificar configuración
echo "🔍 Verificando configuración..."
if grep -q "your_supabase" .env.local; then
    echo "❌ Error: Algunas variables no se configuraron correctamente"
    exit 1
else
    echo "✅ Todas las variables de Supabase configuradas correctamente"
fi

echo ""
echo "🚀 ¡Configuración completada! Ahora vamos a iniciar la aplicación..."
echo ""
echo "🎯 Próximos pasos:"
echo "   1. Iniciar la aplicación: npm run dev"
echo "   2. Abrir http://localhost:3000"
echo "   3. Ver tu dashboard con las 6 habitaciones"
echo "   4. Probar todas las funcionalidades"
echo ""
echo "¿Listo para iniciar? ¡Ejecuta: npm run dev"
