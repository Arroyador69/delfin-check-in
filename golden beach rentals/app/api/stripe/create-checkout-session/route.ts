import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { differenceInCalendarDays } from 'date-fns';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  try {
    const { roomId, checkIn, checkOut, guests } = await req.json();
    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { lodging: true } });
    if (!room || !room.lodging.isOwned) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const nights = Math.max(1, differenceInCalendarDays(new Date(checkOut), new Date(checkIn)));
    const amountCents = room.basePriceCents * nights;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'EUR',
          product_data: { name: `${room.lodging.title} — ${room.name} (${nights} noches)` },
          unit_amount: amountCents,
        },
        quantity: 1
      }],
      success_url: `${process.env.SITE_URL}/alojamientos/mi-hostal?ok=1`,
      cancel_url: `${process.env.SITE_URL}/alojamientos/mi-hostal?cancel=1`,
      metadata: { roomId, checkIn, checkOut, guests: String(guests ?? 1) }
    });

    await prisma.booking.create({
      data: {
        roomId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guests: Number(guests ?? 1),
        amountCents,
        stripeSessionId: session.id,
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
