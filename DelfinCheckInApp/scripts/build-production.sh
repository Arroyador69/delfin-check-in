#!/bin/bash

# =====================================================
# Script: Build de Producción para App Store
# =====================================================

set -e

echo "🚀 Iniciando build de producción para App Store..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "app.config.ts" ]; then
  echo "❌ Error: Debes ejecutar este script desde el directorio delfin-owner-app"
  exit 1
fi

# Verificar que el icono existe
if [ ! -f "assets/icon.png" ]; then
  echo "❌ Error: assets/icon.png no encontrado"
  echo "💡 Crea el icono siguiendo GUIA_ICONO_APP_STORE.md"
  exit 1
fi

# Verificar tamaño del icono (debe ser 1024x1024)
ICON_SIZE=$(file assets/icon.png | grep -o '[0-9]* x [0-9]*' | head -1)
if [ -z "$ICON_SIZE" ]; then
  echo "⚠️  Advertencia: No se pudo verificar el tamaño del icono"
else
  echo "✅ Icono encontrado: $ICON_SIZE"
  if [[ ! "$ICON_SIZE" == *"1024 x 1024"* ]]; then
    echo "⚠️  Advertencia: El icono debería ser 1024x1024px para App Store"
  fi
fi

echo ""
echo "📦 Verificando configuración..."

# Verificar EAS CLI
if ! command -v eas &> /dev/null; then
  echo "❌ EAS CLI no está instalado"
  echo "💡 Instala con: npm install -g eas-cli"
  exit 1
fi

# Verificar que está logueado
if ! eas whoami &> /dev/null; then
  echo "❌ No estás logueado en EAS"
  echo "💡 Ejecuta: eas login"
  exit 1
fi

echo "✅ EAS CLI configurado"
echo ""

# Preguntar si quiere hacer build local o en la nube
echo "¿Dónde quieres compilar?"
echo "1) En la nube (EAS Build) - Recomendado"
echo "2) Localmente (requiere Xcode)"
read -p "Selecciona opción (1 o 2): " BUILD_TYPE

if [ "$BUILD_TYPE" = "2" ]; then
  echo ""
  echo "🏗️  Compilando localmente..."
  npx eas build -p ios --profile production --local
else
  echo ""
  echo "☁️  Compilando en la nube..."
  npx eas build -p ios --profile production
fi

echo ""
echo "✅ Build completado!"
echo ""
echo "📤 Próximos pasos:"
echo "1. Descarga el .ipa desde el enlace proporcionado"
echo "2. O sube automáticamente con: eas submit -p ios --profile production"
echo "3. O sube manualmente usando Transporter o Xcode"
echo ""

