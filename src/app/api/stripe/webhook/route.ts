import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

async function readRawBody(req: Request): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('stripe-signature') || ''
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return new NextResponse('Webhook sin configurar', { status: 500 })
    }

    const rawBody = await readRawBody(req as unknown as Request)
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      return new NextResponse(`Firma inválida: ${err.message}`, { status: 400 })
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const plan = String(pi.metadata?.plan || '')
      const properties = parseInt(String(pi.metadata?.properties || '1'), 10) || 1
      const email = String(pi.metadata?.email || pi.receipt_email || '')

      // TODO: Persistir cliente/tenant y generar magic link
      // Aquí crearíamos el cliente (tenant), guardaríamos stripe_customer_id (si existe) y un token de acceso temporal
      // En este MVP respondemos OK; la creación se puede completar con una cola o función separada
      console.log('✅ payment_intent.succeeded', { plan, properties, email, id: pi.id })
    }

    return new NextResponse('ok', { status: 200 })
  } catch (error: any) {
    return new NextResponse(error?.message || 'Error', { status: 500 })
  }
}


