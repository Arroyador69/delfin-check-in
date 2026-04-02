/**
 * ========================================
 * API: Actualizar Suscripción Stripe
 * ========================================
 * Actualiza suscripción cuando se añaden/quitan habitaciones
 * Recalcula precio con IVA automático
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';
import { calculatePlanPrice } from '@/lib/plan-pricing';
import { getTenantById } from '@/lib/tenant';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { roomCount } = body;

    if (!roomCount || roomCount < 1) {
      return NextResponse.json(
        { success: false, error: 'Número de habitaciones inválido' },
        { status: 400 }
      );
    }

    // Obtener tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const planType = tenant.plan_type || 'free';
    
    // Solo se puede actualizar si tiene plan de pago
    if (planType === 'free') {
      return NextResponse.json(
        { success: false, error: 'El plan gratuito no se puede actualizar. Actualiza a un plan de pago primero.' },
        { status: 400 }
      );
    }

    if (!tenant.stripe_subscription_id) {
      return NextResponse.json(
        { success: false, error: 'No se encontró suscripción activa' },
        { status: 404 }
      );
    }

    // Obtener suscripción actual de Stripe
    const existingSubscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
    
    // Calcular nuevo precio con IVA (checkin, standard, pro)
    const pricing = await calculatePlanPrice(planType as 'checkin' | 'standard' | 'pro', roomCount, tenant.country_code);
    
    console.log('🔄 Actualizando suscripción:', {
      subscriptionId: existingSubscription.id,
      planType,
      oldRoomCount: tenant.current_rooms,
      newRoomCount: roomCount,
      newPricing: pricing
    });

    const planNames: Record<string, string> = { checkin: 'Plan Check-in', standard: 'Plan Standard', pro: 'Plan Pro' };
    const priceAmount = Math.round(pricing.subtotal * 100);
    
    const newPrice = await stripe.prices.create({
      unit_amount: priceAmount,
      currency: 'eur',
      recurring: { interval: 'month' },
      product_data: {
        name: `Delfín Check-in - ${planNames[planType] || planType}`,
        description: `${planNames[planType] || planType}: ${roomCount} propiedades`,
      },
      metadata: {
        plan_id: planType,
        room_count: roomCount.toString(),
        base_price: pricing.subtotal.toString(),
        vat_rate: pricing.vat.vatRate.toString(),
      },
    });

    // Actualizar suscripción en Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      tenant.stripe_subscription_id,
      {
        items: [{
          id: existingSubscription.items.data[0].id,
          price: newPrice.id,
        }],
        proration_behavior: 'always_invoice', // Facturar prorrateado
        metadata: {
          tenant_id: tenant.id,
          plan_id: planType,
          room_count: roomCount.toString(),
          base_price: pricing.subtotal.toString(),
          vat_rate: pricing.vat.vatRate.toString(),
          vat_amount: pricing.vat.vatAmount.toString(),
          total_price: pricing.total.toString(),
        },
      }
    );

    // Actualizar suscripción en BD
    await sql`
      UPDATE subscriptions
      SET 
        base_price = ${pricing.subtotal},
        vat_rate = ${pricing.vat.vatRate},
        vat_amount = ${pricing.vat.vatAmount},
        total_price = ${pricing.total},
        room_count = ${roomCount},
        extra_rooms_price = ${pricing.extraRoomsPrice || 0},
        current_period_start = ${new Date(updatedSubscription.current_period_start * 1000)},
        current_period_end = ${new Date(updatedSubscription.current_period_end * 1000)},
        status = ${updatedSubscription.status},
        updated_at = NOW()
      WHERE stripe_subscription_id = ${tenant.stripe_subscription_id}
    `;

    // Actualizar tenant
    await sql`
      UPDATE tenants
      SET 
        subscription_price = ${pricing.total},
        base_plan_price = ${pricing.subtotal},
        extra_room_price = ${pricing.extraRoomsPrice ?? 2},
        subscription_current_period_end = ${new Date(updatedSubscription.current_period_end * 1000)},
        updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    console.log(`✅ Suscripción actualizada: ${updatedSubscription.id}, ${roomCount} habitaciones, ${pricing.total}€/mes`);

    return NextResponse.json({
      success: true,
      subscription_id: updatedSubscription.id,
      room_count: roomCount,
      pricing: {
        base_price: pricing.subtotal,
        vat_rate: pricing.vat.vatRate,
        vat_amount: pricing.vat.vatAmount,
        total: pricing.total,
        currency: 'EUR'
      },
      prorated: true // Se facturará prorrateado
    });

  } catch (error: any) {
    console.error('❌ Error actualizando suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

