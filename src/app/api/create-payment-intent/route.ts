import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const plan = String(body.plan || '')
    const properties = parseInt(body.properties, 10) || 1
    const email = String(body.email || '')
    const name = String(body.name || '')

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 500 })
    }

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
    }

    if (properties < 1 || properties > 50) {
      return NextResponse.json({ error: 'Número de propiedades inválido' }, { status: 400 })
    }

    let amount = 0
    if (plan === 'monthly') {
      amount = properties * 400 // 4€ en céntimos
    } else if (plan === 'yearly') {
      amount = properties * 4000 // 40€ en céntimos
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      description: `Delfín Check-in - ${plan === 'monthly' ? 'Mensual' : 'Anual'} - ${properties} propiedades`,
      metadata: {
        plan,
        properties: String(properties),
        email,
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


