#!/bin/bash

echo "🗄️  Schema SQL para Supabase"
echo "============================"
echo ""
echo "📋 Copia y pega este SQL en el SQL Editor de Supabase:"
echo "   https://supabase.com/dashboard/project/spdwjdrlemselkqbxaue/sql"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Mostrar el contenido del schema.sql
cat database/schema.sql

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Pasos para ejecutar:"
echo "   1. Ve a https://supabase.com/dashboard/project/spdwjdrlemselkqbxaue/sql"
echo "   2. Copia todo el SQL de arriba"
echo "   3. Pégalo en el SQL Editor"
echo "   4. Haz clic en 'Run'"
echo "   5. Verifica que se crearon las tablas en 'Table Editor'"
echo ""
echo "🔧 Después de ejecutar el SQL, comparte la Service Role Key para continuar"
