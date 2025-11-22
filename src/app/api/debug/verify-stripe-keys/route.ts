import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * Endpoint para verificar que las claves de Stripe coinciden
 * y diagnosticar problemas de desajuste de claves API
 */
export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY || ''
    
    if (!secretKey) {
      return NextResponse.json({ 
        error: 'STRIPE_SECRET_KEY no configurada',
        backend_key: null,
        frontend_key: 'pk_test_51RGg0AGayGuUgznn7Prw8EXPA5m5hYQb0aQrvw5Zv4RC9RYQQTJ1wExhoBjPOta67uXD0A9o8Jeu8PHbfVriyb0f008zMneaNb'
      }, { status: 500 })
    }

    // Extraer información de la clave secreta
    const isTest = secretKey.startsWith('sk_test_')
    const isLive = secretKey.startsWith('sk_live_')
    const keyPrefix = secretKey.substring(0, 12) // Primeros 12 caracteres
    
    // Extraer información de la clave pública del frontend
    const frontendKey = 'pk_test_51RGg0AGayGuUgznn7Prw8EXPA5m5hYQb0aQrvw5Zv4RC9RYQQTJ1wExhoBjPOta67uXD0A9o8Jeu8PHbfVriyb0f008zMneaNb'
    const frontendKeyPrefix = frontendKey.substring(0, 12)
    
    // Verificar que ambas sean test o ambas sean live
    const frontendIsTest = frontendKey.startsWith('pk_test_')
    const frontendIsLive = frontendKey.startsWith('pk_live_')
    
    // Intentar crear un cliente de Stripe para verificar que funciona
    let stripeWorks = false
    let stripeError = null
    let accountInfo = null
    
    try {
      const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })
      
      // Intentar obtener información de la cuenta
      const account = await stripe.account.retrieve()
      stripeWorks = true
      accountInfo = {
        id: account.id,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      }
    } catch (err: any) {
      stripeWorks = false
      stripeError = err.message
    }
    
    // Extraer el ID de la cuenta de ambas claves para comparar
    // En Stripe, las claves tienen el mismo prefijo si son de la misma cuenta
    // pk_test_51XXXXXX... y sk_test_51XXXXXX... deben tener los mismos caracteres después del prefijo
    const frontendAccountId = frontendKey.match(/pk_(test|live)_([A-Za-z0-9]+)/)?.[2]?.substring(0, 8)
    const backendAccountId = secretKey.match(/sk_(test|live)_([A-Za-z0-9]+)/)?.[2]?.substring(0, 8)
    
    const keysMatch = frontendAccountId === backendAccountId && 
                      isTest === frontendIsTest && 
                      isLive === frontendIsLive
    
    return NextResponse.json({
      success: true,
      keys_match: keysMatch,
      backend: {
        key_prefix: keyPrefix,
        key_mode: isTest ? 'test' : (isLive ? 'live' : 'unknown'),
        account_id_prefix: backendAccountId,
        stripe_works: stripeWorks,
        error: stripeError,
        account: accountInfo
      },
      frontend: {
        key_prefix: frontendKeyPrefix,
        key_mode: frontendIsTest ? 'test' : (frontendIsLive ? 'live' : 'unknown'),
        account_id_prefix: frontendAccountId,
        key: frontendKey.substring(0, 20) + '...' // Solo mostrar primeros caracteres
      },
      recommendation: keysMatch 
        ? '✅ Las claves parecen coincidir. Si el problema persiste, verifica que ambas estén activas en Stripe Dashboard.'
        : '❌ Las claves NO coinciden. Actualiza STRIPE_SECRET_KEY en Vercel para que corresponda a la clave pública del frontend.'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Error verificando claves',
      success: false
    }, { status: 500 })
  }
}

