#!/bin/bash

# =====================================================
# Script: Preparar App para App Store
# =====================================================
# Verifica que todo esté listo antes de compilar

set -e

echo "🔍 Verificando preparación para App Store..."
echo ""

ERRORS=0
WARNINGS=0

# Verificar icono
echo "📱 Verificando icono..."
if [ ! -f "assets/icon.png" ]; then
  echo "❌ assets/icon.png no encontrado"
  ERRORS=$((ERRORS + 1))
else
  ICON_SIZE=$(file assets/icon.png 2>/dev/null | grep -o '[0-9]* x [0-9]*' | head -1)
  if [[ "$ICON_SIZE" == *"1024 x 1024"* ]]; then
    echo "✅ Icono: $ICON_SIZE"
  else
    echo "⚠️  Icono: $ICON_SIZE (debería ser 1024x1024)"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Verificar splash
echo "🖼️  Verificando splash screen..."
if [ ! -f "assets/splash.png" ]; then
  echo "⚠️  assets/splash.png no encontrado (opcional pero recomendado)"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ Splash screen encontrado"
fi

# Verificar configuración
echo "⚙️  Verificando configuración..."
if [ ! -f "app.config.ts" ]; then
  echo "❌ app.config.ts no encontrado"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ app.config.ts encontrado"
  
  # Verificar bundle ID
  if grep -q "bundleIdentifier.*com.desarroyo.delfinowner" app.config.ts; then
    echo "✅ Bundle ID configurado"
  else
    echo "⚠️  Bundle ID podría no estar configurado correctamente"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Verificar EAS
echo "🔧 Verificando EAS..."
if ! command -v eas &> /dev/null; then
  echo "❌ EAS CLI no está instalado"
  echo "   Instala con: npm install -g eas-cli"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ EAS CLI instalado"
  
  if eas whoami &> /dev/null; then
    echo "✅ Logueado en EAS"
  else
    echo "⚠️  No estás logueado en EAS"
    echo "   Ejecuta: eas login"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Verificar package.json
echo "📦 Verificando dependencias..."
if [ ! -f "package.json" ]; then
  echo "❌ package.json no encontrado"
  ERRORS=$((ERRORS + 1))
else
  if [ -d "node_modules" ]; then
    echo "✅ Dependencias instaladas"
  else
    echo "⚠️  node_modules no encontrado"
    echo "   Ejecuta: npm install"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ ¡Todo listo para compilar!"
  echo ""
  echo "🚀 Ejecuta:"
  echo "   ./scripts/build-production.sh"
  echo "   o"
  echo "   npx eas build -p ios --profile production"
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Hay $WARNINGS advertencia(s) pero puedes continuar"
  echo ""
  echo "💡 Revisa las advertencias antes de compilar"
  echo "🚀 Ejecuta: ./scripts/build-production.sh"
else
  echo "❌ Hay $ERRORS error(es) que debes corregir antes de compilar"
  echo ""
  echo "💡 Corrige los errores y vuelve a ejecutar este script"
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

