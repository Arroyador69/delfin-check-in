#!/bin/bash

# =====================================================
# Script: Configurar Icono desde Logo
# =====================================================

set -e

ICON_SIZE=1024
OUTPUT_FILE="assets/icon.png"
TEAL_BG="#0D9488"

echo "🎨 Configurando icono de app desde logo de Delfín Check-in..."
echo ""

# Buscar posibles archivos de logo
POSSIBLE_LOGOS=(
  "../logo.png"
  "../logo-delfin.png"
  "../delfin-logo.png"
  "./logo.png"
  "./logo-delfin.png"
  "./delfin-logo.png"
  "~/Downloads/logo.png"
  "~/Downloads/delfin-logo.png"
  "~/Desktop/logo.png"
  "~/Desktop/delfin-logo.png"
)

FOUND_LOGO=""

for logo in "${POSSIBLE_LOGOS[@]}"; do
  expanded=$(eval echo "$logo")
  if [ -f "$expanded" ]; then
    FOUND_LOGO="$expanded"
    echo "✅ Logo encontrado: $FOUND_LOGO"
    break
  fi
done

# Si no se encontró, pedir al usuario
if [ -z "$FOUND_LOGO" ]; then
  echo "📋 No se encontró el logo automáticamente."
  echo ""
  echo "💡 Opciones:"
  echo ""
  echo "1. Arrastra el archivo del logo aquí y presiona Enter:"
  read -p "   Ruta al logo: " FOUND_LOGO
  
  if [ -z "$FOUND_LOGO" ]; then
    echo ""
    echo "❌ No se proporcionó ruta al logo"
    echo ""
    echo "📝 Instrucciones manuales:"
    echo "   1. Guarda el logo como imagen (PNG, JPG, etc.)"
    echo "   2. Ejecuta: ./scripts/create-icon.sh <ruta-al-logo>"
    echo "   3. O usa Preview (macOS):"
    echo "      - Abre el logo en Preview"
    echo "      - Herramientas > Ajustar tamaño"
    echo "      - Establece 1024x1024px"
    echo "      - Guarda como PNG en assets/icon.png"
    exit 1
  fi
fi

# Verificar que el archivo existe
if [ ! -f "$FOUND_LOGO" ]; then
  echo "❌ Error: No se encontró el archivo: $FOUND_LOGO"
  exit 1
fi

echo ""
echo "🔄 Procesando logo..."
echo "   Entrada: $FOUND_LOGO"
echo "   Salida: $OUTPUT_FILE"
echo "   Tamaño: ${ICON_SIZE}x${ICON_SIZE}px"
echo ""

# Asegurar que el directorio assets existe
mkdir -p assets

# Procesar con sips
# Primero redimensionar manteniendo aspecto
sips -z $ICON_SIZE $ICON_SIZE "$FOUND_LOGO" --out "$OUTPUT_FILE" > /dev/null 2>&1

# Verificar resultado
if [ -f "$OUTPUT_FILE" ]; then
  echo "✅ Icono creado exitosamente!"
  echo ""
  
  # Mostrar información
  FILE_INFO=$(file "$OUTPUT_FILE" 2>/dev/null || echo "Archivo creado")
  echo "ℹ️  $FILE_INFO"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ ¡Icono configurado correctamente!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📁 Archivo: $OUTPUT_FILE"
  echo ""
  echo "🚀 Próximo paso: Compilar la app"
  echo "   ./scripts/prepare-for-app-store.sh"
  echo "   ./scripts/build-production.sh"
  echo ""
else
  echo "❌ Error: No se pudo crear el icono"
  echo ""
  echo "💡 Intenta manualmente con Preview:"
  echo "   1. Abre $FOUND_LOGO en Preview"
  echo "   2. Herramientas > Ajustar tamaño"
  echo "   3. Establece 1024x1024px"
  echo "   4. Guarda como PNG en assets/icon.png"
  exit 1
fi

