#!/bin/bash

# Script para solucionar problemas de build con Stripe
echo "🔧 Solucionando problemas de build con Stripe..."

# Lista de archivos que necesitan corrección
files=(
    "src/app/api/create-payment-intent/route.ts"
    "src/app/api/upgrade-plan/route.ts"
    "src/app/api/create-room-subscription/route.ts"
    "src/app/api/billing/cancel/route.ts"
    "src/app/api/billing/reactivate/route.ts"
    "src/app/api/stripe/webhook/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "📝 Procesando: $file"
        
        # Reemplazar inicialización de Stripe
        sed -i '' 's/const stripe = new Stripe(process\.env\.STRIPE_SECRET_KEY || '\'''\''/const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY/g' "$file"
        sed -i '' 's/const stripe = new Stripe(process\.env\.STRIPE_SECRET_KEY)/const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY/g' "$file"
        
        # Añadir null al final si no está
        if ! grep -q "}) : null;" "$file"; then
            sed -i '' 's/});$/}) : null;/g' "$file"
        fi
        
        echo "✅ $file procesado"
    else
        echo "⚠️  Archivo no encontrado: $file"
    fi
done

echo "🎉 Corrección de Stripe completada"




