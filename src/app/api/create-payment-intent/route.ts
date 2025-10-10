import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const planId = String(body.planId || '') // basic, standard, premium, enterprise
    const email = String(body.email || '')
    const name = String(body.name || '')

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 500 })
    }

    // Validar plan_id
    if (!planId || !['basic', 'standard', 'premium', 'enterprise'].includes(planId)) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
    }

    // Mapear plan_id a precio mensual (en céntimos)
    const priceMap = {
      basic: 1499,      // €14.99/mes (1 propiedad)
      standard: 2698,   // €26.98/mes (2 propiedades)
      premium: 5096,    // €50.96/mes (4 propiedades)
      enterprise: 11240 // €112.40/mes (10+ propiedades)
    }

    const amount = priceMap[planId as keyof typeof priceMap]

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      description: `Delfín Check-in - Plan ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
      metadata: {
        planId,
        email,
        name,
        plan: 'monthly' // Por compatibilidad con webhook existente
      },
      receipt_email: email || undefined,
      automatic_payment_methods: { enabled: true },
    })

    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
    const res = NextResponse.json({ client_secret: paymentIntent.client_secret })
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary', 'Origin')
    return res
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com'
  const res = new NextResponse(null, { status: 204 })
  res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Vary', 'Origin')
  return res
}


