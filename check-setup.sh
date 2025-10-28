#!/bin/bash

echo "🔍 Verificando configuración de Delfín Check-in"
echo "=============================================="

# Verificar que .env.local existe
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local encontrado"
else
    echo "❌ Archivo .env.local no encontrado"
    echo "   Ejecuta: ./setup-env.sh"
    exit 1
fi

# Verificar Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis está ejecutándose"
else
    echo "❌ Redis no está ejecutándose"
    echo "   Ejecuta: brew services start redis"
    exit 1
fi

# Verificar dependencias
if [ -d "node_modules" ]; then
    echo "✅ Dependencias instaladas"
else
    echo "❌ Dependencias no instaladas"
    echo "   Ejecuta: npm install"
    exit 1
fi

# Verificar variables de Supabase
if grep -q "your_supabase_url_here" .env.local; then
    echo "⚠️  Variables de Supabase no configuradas"
    echo "   Edita .env.local con tus credenciales de Supabase"
else
    echo "✅ Variables de Supabase configuradas"
fi

echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "=================="
echo ""
echo "1. Configura Supabase (si no lo has hecho):"
echo "   - Ve a https://supabase.com"
echo "   - Crea proyecto y copia credenciales"
echo "   - Edita .env.local"
echo "   - Ejecuta schema.sql en Supabase"
echo ""
echo "2. Inicia la aplicación:"
echo "   npm run dev"
echo ""
echo "3. Abre http://localhost:3000"
echo ""
echo "¡Todo listo para empezar! 🐬✨"
