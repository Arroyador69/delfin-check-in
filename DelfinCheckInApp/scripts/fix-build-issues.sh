#!/bin/bash

# =====================================================
# Script: Solucionar Problemas de Build
# =====================================================

set -e

echo "🔧 Diagnosticando problemas de build..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: Debes ejecutar este script desde delfin-owner-app"
  exit 1
fi

echo "1️⃣ Verificando dependencias locales..."
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules no encontrado. Instalando..."
  npm install
else
  echo "✅ node_modules existe"
fi

echo ""
echo "2️⃣ Verificando versiones de dependencias críticas..."
npm list react react-native expo 2>&1 | grep -E "react@|react-native@|expo@" | head -5

echo ""
echo "3️⃣ Limpiando cache de npm..."
npm cache clean --force 2>/dev/null || echo "Cache limpio"

echo ""
echo "4️⃣ Verificando package-lock.json..."
if [ -f "package-lock.json" ]; then
  echo "✅ package-lock.json existe"
else
  echo "⚠️  package-lock.json no encontrado. Generando..."
  npm install --package-lock-only
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Posibles soluciones:"
echo ""
echo "1. React 19 puede tener problemas. Considera usar React 18:"
echo "   npm install react@18 react-dom@18"
echo ""
echo "2. Reinstalar dependencias:"
echo "   rm -rf node_modules package-lock.json"
echo "   npm install"
echo ""
echo "3. Ver logs completos del build:"
echo "   eas build:view [BUILD_ID]"
echo ""
echo "4. Intentar build local primero:"
echo "   npx expo run:ios"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

