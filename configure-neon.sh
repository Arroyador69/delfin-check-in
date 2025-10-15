#!/bin/bash

echo "🐬 Configurando variables de Neon Database"
echo "=========================================="

# Variables de Neon (ejemplo - reemplazar con tus valores reales)
NEON_DATABASE_URL="postgresql://usuario:password@ep-xxxxx.neon.tech/database"
NEON_PRISMA_URL="postgresql://usuario:password@ep-xxxxx.neon.tech/database?pgbouncer=true&connect_timeout=15"
NEON_NON_POOLING_URL="postgresql://usuario:password@ep-xxxxx.neon.tech/database"

echo "⚠️  IMPORTANTE: Reemplaza las URLs con tus valores reales de Neon"
echo ""
echo "🔧 Para obtener tus URLs de Neon:"
echo "   1. Ve a https://console.neon.tech"
echo "   2. Selecciona tu proyecto"
echo "   3. Ve a 'Connection Details'"
echo "   4. Copia las URLs de conexión"
echo ""
echo "📝 URLs a configurar:"
echo "   POSTGRES_URL=$NEON_DATABASE_URL"
echo "   POSTGRES_PRISMA_URL=$NEON_PRISMA_URL"
echo "   POSTGRES_URL_NON_POOLING=$NEON_NON_POOLING_URL"
echo ""
echo "🎯 Próximos pasos:"
echo "   1. Actualiza las URLs en este script con tus valores reales"
echo "   2. Ejecuta: ./configure-neon.sh"
echo "   3. Ejecuta: npm run dev"
echo ""
echo "¿Tienes las URLs de Neon? ¡Actualízalas en este script y ejecuta de nuevo!"
