import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint para obtener la clave pública de Stripe que corresponde a la clave secreta del backend
 * Esto asegura que el frontend use la clave pública correcta
 */
export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY || ''
    
    if (!secretKey) {
      return NextResponse.json({ 
        error: 'STRIPE_SECRET_KEY no configurada',
      }, { status: 500 })
    }

    // Extraer el prefijo de la cuenta de la clave secreta
    // sk_test_51XXXXXX... -> pk_test_51XXXXXX...
    const isTest = secretKey.startsWith('sk_test_')
    const isLive = secretKey.startsWith('sk_live_')
    
    if (!isTest && !isLive) {
      return NextResponse.json({ 
        error: 'Formato de clave secreta no válido',
      }, { status: 500 })
    }

    // Extraer el ID de la cuenta (los primeros caracteres después del prefijo)
    const accountIdMatch = secretKey.match(/sk_(test|live)_([A-Za-z0-9]+)/)
    if (!accountIdMatch || !accountIdMatch[2]) {
      return NextResponse.json({ 
        error: 'No se pudo extraer el ID de cuenta de la clave secreta',
      }, { status: 500 })
    }

    const accountIdPrefix = accountIdMatch[2].substring(0, 8)
    const keyPrefix = isTest ? 'pk_test_' : 'pk_live_'
    
    // NOTA: No podemos obtener la clave pública completa desde la API de Stripe
    // El usuario debe obtenerla del Dashboard de Stripe
    // Pero podemos devolver información útil para ayudar
    
    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const res = NextResponse.json({ 
      success: true,
      account_id_prefix: accountIdPrefix,
      key_prefix: keyPrefix,
      mode: isTest ? 'test' : 'live',
      instruction: `La clave pública debe empezar con: ${keyPrefix}${accountIdPrefix}...`,
      note: 'Obtén la clave pública completa desde: https://dashboard.stripe.com/test/apikeys (o /apikeys para live)',
      current_frontend_key: 'pk_test_51RGg0AGayGuUgznn7Prw8EXPA5m5hYQb0aQrvw5Zv4RC9RYQQTJ1wExhoBjPOta67uXD0A9o8Jeu8PHbfVriyb0f008zMneaNb',
      keys_match: false,
      recommendation: `Actualiza la clave pública en delfincheckin.com/index.html línea ~2079 para que empiece con ${keyPrefix}${accountIdPrefix}...`
    })
    
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    return res
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Error obteniendo información de claves',
      success: false
    }, { status: 500 })
  }
}

export async function OPTIONS(req: NextRequest) {
  const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

