import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe-server'

// Manejar CORS preflight
export async function OPTIONS(req: NextRequest) {
  const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

/**
 * Endpoint para actualizar un Payment Intent con un Payment Method
 * Necesario cuando se usa automatic_payment_methods
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { payment_intent_id, payment_method_id } = body

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 500 })
    }

    if (!payment_intent_id || !payment_method_id) {
      return NextResponse.json({ 
        error: 'Se requieren payment_intent_id y payment_method_id' 
      }, { status: 400 })
    }

    console.log('💳 [UPDATE PAYMENT INTENT] Actualizando Payment Intent:', {
      payment_intent_id,
      payment_method_id
    })

    // Actualizar el payment intent con el payment method
    const paymentIntent = await getStripeServer().paymentIntents.update(payment_intent_id, {
      payment_method: payment_method_id,
    })

    console.log('✅ [UPDATE PAYMENT INTENT] Payment Intent actualizado:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method,
      client_secret: paymentIntent.client_secret ? '✅ Presente' : '❌ FALTANTE'
    })

    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const res = NextResponse.json({ 
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
      requires_confirmation: paymentIntent.status === 'requires_confirmation'
    })
    
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary', 'Origin')
    return res
  } catch (error: any) {
    console.error('❌ [UPDATE PAYMENT INTENT] Error actualizando Payment Intent:', {
      errorMessage: error?.message,
      errorType: error?.type,
      errorCode: error?.code,
      errorStatus: error?.statusCode
    })
    
    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const errorMessage = error?.message || 'Error interno al actualizar el payment intent'
    
    const res = NextResponse.json({ 
      success: false,
      error: errorMessage
    }, { status: 500 })
    
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    return res
  }
}


