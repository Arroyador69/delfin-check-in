#!/bin/bash

echo "🐬 Configurando variables de Supabase"
echo "===================================="

# Variables de Supabase
SUPABASE_URL="https://spdwjdrlemselkqbxaue.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZHdqZHJsZW1zZWxrcWJ4YXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTU0MzcsImV4cCI6MjA3MTE5MTQzN30.BzX55tzKeSGEL9D7wgJG4M-DCcmQ3K4fZjcHR-LMnAs"

# Actualizar .env.local con las variables de Supabase
sed -i '' "s|your_supabase_url_here|$SUPABASE_URL|g" .env.local
sed -i '' "s|your_supabase_anon_key_here|$SUPABASE_ANON_KEY|g" .env.local

echo "✅ Variables de Supabase configuradas:"
echo "   URL: $SUPABASE_URL"
echo "   Anon Key: ${SUPABASE_ANON_KEY:0:20}..."
echo ""
echo "⚠️  IMPORTANTE: Necesitas configurar la Service Role Key"
echo "   Ve a Settings > API en tu proyecto de Supabase"
echo "   Copia la 'service_role' key y edita .env.local"
echo "   Reemplaza: your_supabase_service_role_key_here"
echo ""
echo "🔧 Próximos pasos:"
echo "   1. Configura la Service Role Key"
echo "   2. Ejecuta el schema SQL en Supabase"
echo "   3. Ejecuta: npm run dev"
echo ""
echo "¿Tienes la Service Role Key? ¡Compártela para configurarla automáticamente!"
