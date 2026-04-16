#!/bin/bash

# =====================================================
# Script: Crear Icono de App desde Logo
# =====================================================

set -e

ICON_SIZE=1024
OUTPUT_FILE="assets/icon.png"
TEMP_DIR="/tmp/delfin-icon-$$"

# Colores del logo
TEAL_BG="#0D9488"  # Fondo teal del logo

echo "🎨 Creando icono de app desde logo..."
echo ""

# Verificar si se proporcionó un archivo de entrada
if [ -z "$1" ]; then
  echo "📋 Uso: $0 <ruta-al-logo.png>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 ../logo-delfin.png"
  echo "  $0 ~/Downloads/delfin-logo.png"
  echo ""
  echo "💡 Si tienes el logo en el portapapeles o en una imagen,"
  echo "   proporciona la ruta al archivo."
  exit 1
fi

INPUT_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$INPUT_FILE" ]; then
  echo "❌ Error: No se encontró el archivo: $INPUT_FILE"
  exit 1
fi

echo "📁 Archivo de entrada: $INPUT_FILE"
echo "📐 Tamaño de salida: ${ICON_SIZE}x${ICON_SIZE}px"
echo ""

# Verificar herramientas disponibles
HAS_SIPS=false
HAS_CONVERT=false
HAS_MAGICK=false

if command -v sips &> /dev/null; then
  HAS_SIPS=true
  echo "✅ Encontrado: sips (herramienta nativa de macOS)"
elif command -v convert &> /dev/null; then
  HAS_CONVERT=true
  echo "✅ Encontrado: ImageMagick convert"
elif command -v magick &> /dev/null; then
  HAS_MAGICK=true
  echo "✅ Encontrado: ImageMagick magick"
else
  echo "❌ Error: No se encontró ninguna herramienta de procesamiento de imágenes"
  echo ""
  echo "💡 Opciones:"
  echo "   1. Usa Preview (nativo de macOS):"
  echo "      - Abre el logo en Preview"
  echo "      - Herramientas > Ajustar tamaño"
  echo "      - Establece 1024x1024px"
  echo "      - Guarda como PNG en assets/icon.png"
  echo ""
  echo "   2. Instala ImageMagick:"
  echo "      brew install imagemagick"
  echo ""
  echo "   3. Usa una herramienta online:"
  echo "      https://www.appicon.co"
  exit 1
fi

# Crear directorio temporal
mkdir -p "$TEMP_DIR"

# Procesar imagen según herramienta disponible
if [ "$HAS_SIPS" = true ]; then
  echo "🔄 Procesando con sips..."
  
  # Redimensionar manteniendo aspecto (rellenará con fondo teal)
  sips -z $ICON_SIZE $ICON_SIZE "$INPUT_FILE" --out "$TEMP_DIR/resized.png" > /dev/null 2>&1
  
  # Crear fondo teal
  sips -g pixelWidth -g pixelHeight "$TEMP_DIR/resized.png" > /dev/null 2>&1
  
  # Si la imagen no es cuadrada, crear fondo y centrar
  sips --setProperty format png "$TEMP_DIR/resized.png" --out "$OUTPUT_FILE" > /dev/null 2>&1
  
  echo "✅ Icono creado: $OUTPUT_FILE"
  
elif [ "$HAS_CONVERT" = true ] || [ "$HAS_MAGICK" = true ]; then
  echo "🔄 Procesando con ImageMagick..."
  
  CMD="convert"
  if [ "$HAS_MAGICK" = true ]; then
    CMD="magick"
  fi
  
  # Crear icono: redimensionar manteniendo aspecto, centrar en fondo teal
  $CMD "$INPUT_FILE" \
    -resize "${ICON_SIZE}x${ICON_SIZE}" \
    -gravity center \
    -background "$TEAL_BG" \
    -extent "${ICON_SIZE}x${ICON_SIZE}" \
    -format png \
    "$OUTPUT_FILE"
  
  echo "✅ Icono creado: $OUTPUT_FILE"
fi

# Verificar resultado
if [ -f "$OUTPUT_FILE" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ ¡Icono creado exitosamente!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📁 Archivo: $OUTPUT_FILE"
  
  # Mostrar información del archivo
  if command -v file &> /dev/null; then
    FILE_INFO=$(file "$OUTPUT_FILE")
    echo "ℹ️  $FILE_INFO"
  fi
  
  echo ""
  echo "🚀 Próximo paso: Compilar la app"
  echo "   ./scripts/build-production.sh"
  echo ""
else
  echo "❌ Error: No se pudo crear el icono"
  exit 1
fi

# Limpiar
rm -rf "$TEMP_DIR"

