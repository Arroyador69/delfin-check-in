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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const planId = String(body.planId || '') // basic, basic_yearly, standard
    const properties = parseInt(String(body.properties || 1))
    const email = String(body.email || '')
    const name = String(body.name || '')

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 500 })
    }

    // Validar plan_id
    if (!planId || !['basic', 'basic_yearly', 'standard'].includes(planId)) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
    }

    // Función para calcular precios por volumen (igual que en el frontend)
    function getVolumePrice(properties: number): number {
      if (properties === 1) return 14.99;
      if (properties === 2) return 13.49;
      if (properties >= 3 && properties <= 4) return 12.74;
      if (properties >= 5 && properties <= 9) return 11.99;
      if (properties >= 10) return 11.24;
      return 14.99; // Default
    }

    // Calcular precio total según plan y propiedades
    function calculateTotalPrice(properties: number, isYearly: boolean = false): number {
      const pricePerProperty = getVolumePrice(properties);
      let total: number;
      
      if (isYearly) {
        const yearlyPrice = pricePerProperty * 12;
        const annualDiscount = yearlyPrice * 0.167; // 16.7% descuento anual
        total = (yearlyPrice - annualDiscount) * properties;
      } else {
        total = pricePerProperty * properties;
      }
      
      return Math.round(total * 100); // Convertir a céntimos
    }

    const amount = calculateTotalPrice(properties, planId === 'basic_yearly')

    // Crear o buscar customer en Stripe para asociar el pago
    let customerId: string | undefined
    if (email) {
      try {
        // Buscar customer existente por email
        const existingCustomers = await stripe.customers.list({
          email: email,
          limit: 1
        })
        
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id
          console.log('✅ Customer existente encontrado:', customerId)
        } else {
          // Crear nuevo customer
          const customer = await stripe.customers.create({
            email: email,
            name: name,
            metadata: {
              source: 'landing_page',
              planId: planId
            }
          })
          customerId = customer.id
          console.log('✅ Nuevo customer creado:', customerId)
        }
      } catch (customerError) {
        console.error('⚠️ Error creando/buscando customer:', customerError)
        // Continuar sin customer si hay error
      }
    }

    // Preparar parámetros para el payment intent
    const paymentIntentParams: any = {
      amount,
      currency: 'eur',
      description: `Delfín Check-in - Plan ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
      metadata: {
        planId,
        properties: properties.toString(),
        email,
        name,
        plan: planId === 'basic_yearly' ? 'yearly' : 'monthly', // Por compatibilidad con webhook existente
        source: 'landing_page' // Marcar como pago de landing page
      },
      receipt_email: email || undefined,
      automatic_payment_methods: { enabled: true },
      // Nota: confirmation_method puede no ser compatible con automatic_payment_methods
      // Dejar que Stripe use el método por defecto
    }
    
    // Solo incluir customer si existe
    if (customerId) {
      paymentIntentParams.customer = customerId
    }
    
    console.log('💳 [CREATE PAYMENT INTENT] Creando Payment Intent con:', {
      amount,
      amountInEuros: (amount / 100).toFixed(2),
      currency: 'eur',
      hasCustomer: !!customerId,
      customerId: customerId || 'N/A',
      email,
      planId,
      properties
    })
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)
    
    console.log('✅ Payment Intent creado:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      customer: paymentIntent.customer,
      email: email,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret ? '✅ Presente' : '❌ FALTANTE',
      client_secret_length: paymentIntent.client_secret?.length || 0,
      livemode: paymentIntent.livemode
    })

    if (!paymentIntent.client_secret) {
      console.error('❌ ERROR CRÍTICO: Payment Intent creado sin client_secret!')
      return NextResponse.json({ 
        error: 'Error al crear el payment intent. Por favor, intenta de nuevo.' 
      }, { status: 500 })
    }

    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const res = NextResponse.json({ 
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status
    })
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary', 'Origin')
    return res
  } catch (error: any) {
    console.error('❌ [CREATE PAYMENT INTENT] Error creando Payment Intent:', {
      errorMessage: error?.message,
      errorType: error?.type,
      errorCode: error?.code,
      errorStatus: error?.statusCode,
      errorRaw: error,
      stripeError: error?.raw
    })
    
    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const errorMessage = error?.message || 'Error interno al crear el payment intent'
    
    const res = NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        type: error?.type,
        code: error?.code,
        statusCode: error?.statusCode
      } : undefined
    }, { status: 500 })
    
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    return res
  }
}
