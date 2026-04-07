/**
 * ========================================
 * API: Stripe Checkout Session (suscripción)
 * ========================================
 * Usado en onboarding para pagar con Stripe Checkout (hosted).
 * Soporta mensual/anual y precio dinámico según unidades.
 */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantById } from '@/lib/tenant';
import { calculatePlanPriceWithInterval, type BillingInterval, type PlanId } from '@/lib/plan-pricing';
import { getStripeServer } from '@/lib/stripe-server';

function normalizeInterval(input: string | undefined | null): BillingInterval {
  const v = String(input || '').toLowerCase();
  return v === 'year' || v === 'annual' || v === 'yearly' ? 'year' : 'month';
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || (await (await import('@/lib/tenant')).getTenantId(req));
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const body = await req.json();
    const planId = body.planId as PlanId | undefined;
    const roomCount = Number(body.roomCount ?? 1);
    const interval = normalizeInterval(body.interval);
    const locale = String(body.locale || 'es');

    if (!planId || !['free', 'checkin', 'standard', 'pro'].includes(planId)) {
      return NextResponse.json({ success: false, error: 'Plan inválido' }, { status: 400 });
    }
    if (!Number.isFinite(roomCount) || roomCount < 1 || roomCount > 500) {
      return NextResponse.json({ success: false, error: 'Unidades inválidas (1-500)' }, { status: 400 });
    }
    if (planId === 'free') {
      return NextResponse.json({ success: false, error: 'El plan gratis no requiere pago' }, { status: 400 });
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
    if (!appUrl) {
      return NextResponse.json({ success: false, error: 'NEXT_PUBLIC_APP_URL no configurada' }, { status: 500 });
    }

    const pricing = await calculatePlanPriceWithInterval(planId, roomCount, interval, tenant.country_code || 'ES');

    // Customer
    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripeServer().customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenant_id: tenant.id },
      });
      customerId = customer.id;
      await sql`UPDATE tenants SET stripe_customer_id = ${customerId} WHERE id = ${tenantId}`;
    }

    // Creamos un Price dinámico (importe TOTAL con IVA incluido para que cuadre lo que se muestra)
    const unitAmount = Math.round(pricing.total * 100);
    const planNames: Record<string, string> = {
      checkin: 'Plan Check-in',
      standard: 'Plan Standard',
      pro: 'Plan Pro',
    };

    const price = await getStripeServer().prices.create({
      unit_amount: unitAmount,
      currency: 'eur',
      recurring: { interval },
      product_data: {
        name: `Delfín Check-in - ${planNames[planId] || planId}`,
        description:
          interval === 'year'
            ? `${planNames[planId] || planId}: ${roomCount} unidades (anual, IVA incl.)`
            : `${planNames[planId] || planId}: ${roomCount} unidades (mensual, IVA incl.)`,
      },
      metadata: {
        plan_id: planId,
        room_count: String(roomCount),
        billing_interval: interval,
        subtotal_ex_vat: String(pricing.subtotal),
        vat_rate: String(pricing.vat.vatRate),
        vat_amount: String(pricing.vat.vatAmount),
        total_inc_vat: String(pricing.total),
        yearly_discount_rate: pricing.yearlyDiscountRate != null ? String(pricing.yearlyDiscountRate) : '',
      },
    });

    const successUrl = `${appUrl}/${locale}/onboarding?checkout=success`;
    const cancelUrl = `${appUrl}/${locale}/onboarding?checkout=cancel`;

    const session = await getStripeServer().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          tenant_id: tenant.id,
          plan_id: planId,
          room_count: String(roomCount),
          billing_interval: interval,
          subtotal_ex_vat: String(pricing.subtotal),
          vat_rate: String(pricing.vat.vatRate),
          vat_amount: String(pricing.vat.vatAmount),
          total_inc_vat: String(pricing.total),
          yearly_discount_rate: pricing.yearlyDiscountRate != null ? String(pricing.yearlyDiscountRate) : '',
          source: 'onboarding_checkout',
        },
      },
      metadata: {
        tenant_id: tenant.id,
        plan_id: planId,
        room_count: String(roomCount),
        billing_interval: interval,
        source: 'onboarding_checkout',
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      session_id: session.id,
      pricing: {
        subtotal: pricing.subtotal,
        vat: pricing.vat,
        total: pricing.total,
        interval,
        currency: 'EUR',
      },
    });
  } catch (error: any) {
    console.error('❌ Error creando checkout session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

