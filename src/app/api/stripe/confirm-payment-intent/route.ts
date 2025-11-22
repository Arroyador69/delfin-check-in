import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

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
 * Endpoint para confirmar un Payment Intent completamente desde el backend
 * Esto evita problemas de desajuste de claves API entre frontend y backend
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

    console.log('💳 [CONFIRM PAYMENT INTENT] Confirmando Payment Intent desde backend:', {
      payment_intent_id,
      payment_method_id
    })

    // Primero, recuperar el Payment Intent para verificar su estado
    let paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
    
    console.log('📋 [CONFIRM PAYMENT INTENT] Estado actual del Payment Intent:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method
    })

    // Si el Payment Intent ya tiene un payment method diferente, primero actualizarlo
    if (paymentIntent.payment_method && paymentIntent.payment_method !== payment_method_id) {
      console.log('🔄 [CONFIRM PAYMENT INTENT] Actualizando Payment Method...')
      paymentIntent = await stripe.paymentIntents.update(payment_intent_id, {
        payment_method: payment_method_id,
      })
    } else if (!paymentIntent.payment_method) {
      console.log('🔄 [CONFIRM PAYMENT INTENT] Adjuntando Payment Method...')
      paymentIntent = await stripe.paymentIntents.update(payment_intent_id, {
        payment_method: payment_method_id,
      })
    }

    // Si el Payment Intent ya está confirmado o succeeded, devolverlo directamente
    if (paymentIntent.status === 'succeeded') {
      console.log('✅ [CONFIRM PAYMENT INTENT] Payment Intent ya está confirmado')
      const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
      const res = NextResponse.json({ 
        success: true,
        payment_intent: paymentIntent,
        status: paymentIntent.status
      })
      
      res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
      res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
      res.headers.set('Access-Control-Allow-Credentials', 'true')
      return res
    }

    // Si requiere confirmación, confirmarlo
    if (paymentIntent.status === 'requires_confirmation' || paymentIntent.status === 'requires_payment_method') {
      console.log('✅ [CONFIRM PAYMENT INTENT] Confirmando Payment Intent...')
      paymentIntent = await stripe.paymentIntents.confirm(payment_intent_id, {
        payment_method: payment_method_id,
      })

      console.log('✅ [CONFIRM PAYMENT INTENT] Payment Intent confirmado:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        next_action: paymentIntent.next_action
      })
    }

    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const res = NextResponse.json({ 
      success: true,
      payment_intent: paymentIntent,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
      requires_action: paymentIntent.status === 'requires_action',
      next_action: paymentIntent.next_action
    })
    
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary', 'Origin')
    return res
  } catch (error: any) {
    console.error('❌ [CONFIRM PAYMENT INTENT] Error confirmando Payment Intent:', {
      errorMessage: error?.message,
      errorType: error?.type,
      errorCode: error?.code,
      errorStatus: error?.statusCode,
      payment_intent: error?.payment_intent
    })
    
    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const errorMessage = error?.message || 'Error interno al confirmar el payment intent'
    
    const res = NextResponse.json({ 
      success: false,
      error: errorMessage,
      error_code: error?.code,
      error_type: error?.type
    }, { status: error?.statusCode || 500 })
    
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    return res
  }
}

