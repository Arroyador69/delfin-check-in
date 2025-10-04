import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const buf = Buffer.from(await req.arrayBuffer());
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whSecret) return new NextResponse('Missing webhook secret', { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, whSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    await prisma.booking.updateMany({ where: { stripeSessionId: sessionId }, data: { status: 'PAID' } });
  }

  return NextResponse.json({ received: true });
}

export const config = { api: { bodyParser: false } } as const;
