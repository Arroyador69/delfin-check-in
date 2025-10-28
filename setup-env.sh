#!/bin/bash

echo "🐬 Configurando variables de entorno para Delfín Check-in"
echo "=================================================="

# Crear .env.local si no existe
if [ ! -f .env.local ]; then
    cp env.example .env.local
    echo "✅ Archivo .env.local creado"
else
    echo "✅ Archivo .env.local ya existe"
fi

echo ""
echo "📝 INSTRUCCIONES PARA CONFIGURAR:"
echo "=================================="
echo ""
echo "1. Ve a https://supabase.com y crea un proyecto"
echo "2. En tu proyecto de Supabase, ve a Settings > API"
echo "3. Copia las siguientes credenciales:"
echo "   - Project URL"
echo "   - Anon public key"
echo "   - Service role key (secret)"
echo ""
echo "4. Edita el archivo .env.local y reemplaza:"
echo "   - your_supabase_url_here con tu Project URL"
echo "   - your_supabase_anon_key_here con tu Anon public key"
echo "   - your_supabase_service_role_key_here con tu Service role key"
echo ""
echo "5. En el SQL Editor de Supabase, ejecuta el contenido de database/schema.sql"
echo ""
echo "6. Una vez configurado, ejecuta: npm run dev"
echo ""
echo "🔒 NOTA: Las variables de Telegram, Email y Stripe son opcionales"
echo "   Puedes configurarlas más adelante si las necesitas"
echo ""
echo "¿Necesitas ayuda con algún paso? ¡Pregunta!"
