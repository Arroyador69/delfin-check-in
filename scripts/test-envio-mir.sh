#!/bin/bash

# Script para probar el sistema de envío al MIR
# Uso: ./scripts/test-envio-mir.sh [local|produccion]

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurar URL base según el entorno
if [ "$1" == "produccion" ]; then
    BASE_URL="https://delfincheckin.com"
    echo -e "${BLUE}🌍 Probando en PRODUCCIÓN: $BASE_URL${NC}\n"
else
    BASE_URL="http://localhost:3000"
    echo -e "${BLUE}🏠 Probando en LOCAL: $BASE_URL${NC}\n"
fi

echo "=================================================="
echo "🧪 TEST DEL SISTEMA DE ENVÍO AL MIR"
echo "=================================================="
echo ""

# Test 1: Verificar estado de envíos
echo -e "${YELLOW}📊 Test 1: Obteniendo estado de envíos...${NC}"
ESTADO=$(curl -s "${BASE_URL}/api/ministerio/estado-envios")
PENDIENTES=$(echo $ESTADO | jq -r '.estadisticas.pendientes // 0')
ENVIADOS=$(echo $ESTADO | jq -r '.estadisticas.enviados // 0')
ERRORES=$(echo $ESTADO | jq -r '.estadisticas.errores // 0')
TOTAL=$(echo $ESTADO | jq -r '.estadisticas.total // 0')

if [ "$TOTAL" != "null" ]; then
    echo -e "${GREEN}✅ Estado obtenido correctamente${NC}"
    echo "   Total: $TOTAL"
    echo "   Pendientes: $PENDIENTES"
    echo "   Enviados: $ENVIADOS"
    echo "   Errores: $ERRORES"
else
    echo -e "${RED}❌ Error obteniendo estado${NC}"
    echo $ESTADO | jq
    exit 1
fi

echo ""
echo "--------------------------------------------------"
echo ""

# Test 2: Probar conexión con el MIR
echo -e "${YELLOW}🔍 Test 2: Probando conexión con el MIR...${NC}"
CONEXION=$(curl -s -X POST "${BASE_URL}/api/ministerio/test-conexion")
SUCCESS=$(echo $CONEXION | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
    echo -e "${GREEN}✅ Conexión exitosa con el MIR${NC}"
    echo $CONEXION | jq -r '.message'
    echo ""
    echo "Configuración:"
    echo $CONEXION | jq '.config'
else
    echo -e "${RED}❌ Error en la conexión${NC}"
    echo $CONEXION | jq -r '.message'
    echo ""
    echo "Detalles del error:"
    echo $CONEXION | jq
    
    # Verificar si son variables de entorno faltantes
    MISSING=$(echo $CONEXION | jq -r '.missingVars // [] | length')
    if [ "$MISSING" != "0" ]; then
        echo -e "${RED}⚠️  Variables de entorno faltantes:${NC}"
        echo $CONEXION | jq -r '.missingVars[]'
        exit 1
    fi
fi

echo ""
echo "--------------------------------------------------"
echo ""

# Test 3: Procesar pendientes (solo si hay pendientes y la conexión fue exitosa)
if [ "$PENDIENTES" -gt 0 ] && [ "$SUCCESS" == "true" ]; then
    echo -e "${YELLOW}🚀 Test 3: Procesando registros pendientes...${NC}"
    echo -e "${BLUE}¿Deseas procesar los $PENDIENTES registros pendientes? (s/n)${NC}"
    read -r respuesta
    
    if [ "$respuesta" == "s" ] || [ "$respuesta" == "S" ]; then
        echo "Procesando..."
        RESULTADO=$(curl -s -X POST "${BASE_URL}/api/ministerio/procesar-pendientes")
        SUCCESS=$(echo $RESULTADO | jq -r '.success')
        
        if [ "$SUCCESS" == "true" ]; then
            PROCESADOS=$(echo $RESULTADO | jq -r '.procesados')
            EXITOSOS=$(echo $RESULTADO | jq -r '.exitosos')
            ERRORES_PROC=$(echo $RESULTADO | jq -r '.errores')
            
            echo -e "${GREEN}✅ Procesamiento completado${NC}"
            echo "   Procesados: $PROCESADOS"
            echo "   Exitosos: $EXITOSOS"
            echo "   Errores: $ERRORES_PROC"
            echo ""
            echo "Detalles:"
            echo $RESULTADO | jq '.detalles'
        else
            echo -e "${RED}❌ Error en el procesamiento${NC}"
            echo $RESULTADO | jq -r '.message'
        fi
    else
        echo "Saltando procesamiento de pendientes."
    fi
elif [ "$PENDIENTES" -eq 0 ]; then
    echo -e "${BLUE}ℹ️  No hay registros pendientes para procesar${NC}"
elif [ "$SUCCESS" != "true" ]; then
    echo -e "${RED}⚠️  Saltando procesamiento debido a error de conexión${NC}"
fi

echo ""
echo "=================================================="
echo "✅ PRUEBAS COMPLETADAS"
echo "=================================================="
echo ""

# Resumen final
echo "📊 Resumen:"
echo "   - Estado de envíos: ✅"
if [ "$SUCCESS" == "true" ]; then
    echo "   - Conexión MIR: ✅"
else
    echo "   - Conexión MIR: ❌"
fi
if [ "$PENDIENTES" -eq 0 ]; then
    echo "   - Registros pendientes: ✅ (0)"
else
    echo "   - Registros pendientes: ⚠️  ($PENDIENTES sin procesar)"
fi

echo ""
echo "Para ver los logs en tiempo real:"
if [ "$1" == "produccion" ]; then
    echo "   vercel logs --follow | grep -i mir"
else
    echo "   npm run dev (en otra terminal)"
fi

echo ""
echo "Para acceder al dashboard:"
echo "   ${BASE_URL}/estado-envios-mir"
echo ""

