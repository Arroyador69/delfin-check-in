#!/bin/bash

# ========================================
# SCRIPT DE LIMPIEZA DE ENDPOINTS DUPLICADOS MIR
# ========================================
# Basado en las normas oficiales MIR v3.1.3
# Mantiene solo los endpoints necesarios para el sistema multitenant
# 
# ENDPOINT PRINCIPAL: /api/ministerio/auto-envio-dual (envía PV + RH)
# ENDPOINT CONSULTA: /api/ministerio/estado-envios
# ENDPOINT CONSULTA: /api/ministerio/consulta-oficial

echo "🧹 Iniciando limpieza de endpoints MIR duplicados..."

# Directorio base
API_DIR="src/app/api/ministerio"

# Endpoints a ELIMINAR (duplicados o obsoletos)
ENDPOINTS_TO_DELETE=(
    "envio-oficial"           # Duplicado de auto-envio-dual
    "envio-multitenant"       # Duplicado de auto-envio-dual  
    "test-envio-real"         # Solo para testing
    "test-real"               # Solo para testing
    "test-envio"              # Solo para testing
    "test-simple"             # Solo para testing
    "test-basic"              # Solo para testing
    "test-simulacion"         # Solo para testing
    "test-produccion"         # Solo para testing
    "test-final-production"   # Solo para testing
    "test-mir-direct"         # Solo para testing
    "test-bypass-ssl"         # Solo para testing
    "test-cert"               # Solo para testing
    "test-conexion"           # Solo para testing
    "test-connectivity"       # Solo para testing
    "test-consulta"           # Solo para testing
    "test-credentials-fix"    # Solo para testing
    "test-fechas"             # Solo para testing
    "test-alta-pv"            # Solo para testing
    "test-auto-envio"         # Solo para testing
    "envio"                   # Endpoint genérico obsoleto
    "partes"                  # Funcionalidad incluida en auto-envio-dual
    "partes-conjunto"         # Funcionalidad incluida en auto-envio-dual
    "partes-dia"              # Funcionalidad incluida en auto-envio-dual
    "auto-envio"              # Solo PV, usar auto-envio-dual
    "auto-envio-rh"           # Solo RH, usar auto-envio-dual
    "consulta-simple"         # Usar consulta-oficial
    "consulta-completa"       # Usar consulta-oficial
    "consulta-lote"           # Funcionalidad incluida en estado-envios
    "consulta-lotes"          # Funcionalidad incluida en estado-envios
    "catalogo-simple"         # Usar catalogo-oficial
    "catalogo-completo"       # Usar catalogo-oficial
    "debug-datos"             # Solo para debugging
    "debug-download-zip"      # Solo para debugging
    "debug-env"                # Solo para debugging
    "debug-preview"           # Solo para debugging
    "diagnostico"             # Solo para debugging
    "generar-xml"             # Funcionalidad interna
    "get-xml"                 # Funcionalidad interna
    "migrate-db"              # Solo para migración
    "migrate-notifications"   # Solo para migración
    "normalizar-pendientes"   # Funcionalidad interna
    "notificaciones"          # Funcionalidad interna
    "notificar-errores"       # Funcionalidad interna
    "procesar-pendientes"     # Funcionalidad interna
    "registros-completos"     # Funcionalidad incluida en estado-envios
    "sincronizar-todos-mir"   # Funcionalidad interna
    "verificar-config"        # Solo para verificación
    "verify-credentials"      # Solo para verificación
    "config-produccion"       # Configuración interna
    "comunicaciones"          # Funcionalidad incluida en estado-envios
    "consulta-tiempo-real-mir" # Funcionalidad incluida en consulta-oficial
    "consultar-estado-real-mir" # Funcionalidad incluida en estado-envios
    "fix-mir-status"          # Solo para corrección manual
)

# Endpoints a MANTENER (necesarios según normas MIR)
ENDPOINTS_TO_KEEP=(
    "auto-envio-dual"         # ✅ PRINCIPAL: Envía PV + RH según normas MIR
    "estado-envios"           # ✅ CONSULTA: Estado de comunicaciones
    "consulta-oficial"        # ✅ CONSULTA: Consulta oficial MIR
    "catalogo-oficial"        # ✅ CATÁLOGO: Catálogo oficial MIR
    "anulacion-oficial"       # ✅ ANULACIÓN: Anulación oficial MIR
)

echo "📋 Endpoints a eliminar: ${#ENDPOINTS_TO_DELETE[@]}"
echo "📋 Endpoints a mantener: ${#ENDPOINTS_TO_KEEP[@]}"

# Función para eliminar endpoint
delete_endpoint() {
    local endpoint=$1
    local endpoint_dir="$API_DIR/$endpoint"
    
    if [ -d "$endpoint_dir" ]; then
        echo "🗑️  Eliminando endpoint: $endpoint"
        rm -rf "$endpoint_dir"
        echo "✅ Endpoint $endpoint eliminado"
    else
        echo "⚠️  Endpoint $endpoint no encontrado"
    fi
}

# Función para verificar endpoint
verify_endpoint() {
    local endpoint=$1
    local endpoint_dir="$API_DIR/$endpoint"
    
    if [ -d "$endpoint_dir" ]; then
        echo "✅ Endpoint $endpoint existe"
        return 0
    else
        echo "❌ Endpoint $endpoint NO existe"
        return 1
    fi
}

echo ""
echo "🔍 Verificando endpoints a mantener..."
for endpoint in "${ENDPOINTS_TO_KEEP[@]}"; do
    verify_endpoint "$endpoint"
done

echo ""
echo "🗑️  Eliminando endpoints duplicados..."
for endpoint in "${ENDPOINTS_TO_DELETE[@]}"; do
    delete_endpoint "$endpoint"
done

echo ""
echo "🔍 Verificación final..."
echo "Endpoints restantes en $API_DIR:"
ls -la "$API_DIR" | grep "^d" | awk '{print $9}' | grep -v "^\.$" | grep -v "^\.\.$"

echo ""
echo "📊 Resumen de la limpieza:"
echo "- Endpoints eliminados: ${#ENDPOINTS_TO_DELETE[@]}"
echo "- Endpoints mantenidos: ${#ENDPOINTS_TO_KEEP[@]}"
echo "- Total endpoints MIR restantes: $(ls -d $API_DIR/*/ 2>/dev/null | wc -l)"

echo ""
echo "🎉 Limpieza completada!"
echo ""
echo "📋 ENDPOINTS PRINCIPALES SEGÚN NORMAS MIR v3.1.3:"
echo "1. /api/ministerio/auto-envio-dual    - Envío PV + RH (PRINCIPAL)"
echo "2. /api/ministerio/estado-envios      - Estado de comunicaciones"
echo "3. /api/ministerio/consulta-oficial   - Consulta oficial MIR"
echo "4. /api/ministerio/catalogo-oficial   - Catálogo oficial MIR"
echo "5. /api/ministerio/anulacion-oficial   - Anulación oficial MIR"
echo ""
echo "✅ Sistema MIR optimizado según normas oficiales"






