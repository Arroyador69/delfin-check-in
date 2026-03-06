/**
 * ========================================
 * API: Crear Suscripción Stripe
 * ========================================
 * Crea una suscripción para los nuevos planes (checkin, pro)
 * Maneja IVA automático y cálculo de precios según habitaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';
import { calculatePlanPrice } from '@/lib/plan-pricing';
import { getTenantById } from '@/lib/tenant';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
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
    const { planId, paymentMethodId, roomCount = 2 } = body;

    // Validar plan (checkin, standard, pro)
    if (!planId || !['checkin', 'standard', 'pro'].includes(planId)) {
      return NextResponse.json(
        { success: false, error: 'Plan inválido. Debe ser "checkin", "standard" o "pro"' },
        { status: 400 }
      );
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, error: 'Método de pago requerido' },
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

    // Calcular precio con IVA
    const pricing = await calculatePlanPrice(planId, roomCount, tenant.country_code);
    
    console.log('💰 Calculando suscripción:', {
      planId,
      roomCount,
      countryCode: tenant.country_code,
      pricing
    });

    // Crear o obtener customer de Stripe
    let customerId = tenant.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: {
          tenant_id: tenant.id,
        },
      });
      customerId = customer.id;
      
      await sql`
        UPDATE tenants
        SET stripe_customer_id = ${customerId}
        WHERE id = ${tenantId}
      `;
    }

    // Attach payment method
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Configurar como método de pago por defecto
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Crear price en Stripe (en centavos, sin IVA - Stripe maneja impuestos después)
    const priceAmount = Math.round(pricing.subtotal * 100); // Convertir a centavos
    
    const planNames: Record<string, string> = {
      checkin: 'Plan Check-in',
      standard: 'Plan Standard',
      pro: 'Plan Pro'
    };
    const price = await stripe.prices.create({
      unit_amount: priceAmount,
      currency: 'eur',
      recurring: { interval: 'month' },
      product_data: {
        name: `Delfín Check-in - ${planNames[planId] || planId}`,
        description: `${planNames[planId] || planId}: ${roomCount} propiedades (${pricing.subtotal}€/mes + IVA)`,
      },
      metadata: {
        plan_id: planId,
        room_count: roomCount.toString(),
        base_price: pricing.subtotal.toString(),
        vat_rate: pricing.vat.vatRate.toString(),
      },
    });

    // Crear suscripción
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      metadata: {
        tenant_id: tenant.id,
        plan_id: planId,
        room_count: roomCount.toString(),
        base_price: pricing.subtotal.toString(),
        vat_rate: pricing.vat.vatRate.toString(),
        vat_amount: pricing.vat.vatAmount.toString(),
        total_price: pricing.total.toString(),
      },
    });

    // Guardar suscripción en BD
    await sql`
      INSERT INTO subscriptions (
        tenant_id, plan_id, stripe_subscription_id, stripe_customer_id,
        status, current_period_start, current_period_end,
        base_price, vat_rate, vat_amount, total_price, currency,
        room_count, extra_rooms_price
      ) VALUES (
        ${tenantId}::uuid,
        ${planId},
        ${subscription.id},
        ${customerId},
        ${subscription.status},
        ${new Date(subscription.current_period_start * 1000)},
        ${new Date(subscription.current_period_end * 1000)},
        ${pricing.subtotal},
        ${pricing.vat.vatRate},
        ${pricing.vat.vatAmount},
        ${pricing.total},
        'EUR',
        ${roomCount},
        ${pricing.extraRoomsPrice || 0}
      )
    `;

    // Actualizar tenant
    await sql`
      UPDATE tenants
      SET 
        plan_type = ${planId},
        plan_id = ${planId === 'checkin' ? 'premium' : planId === 'standard' ? 'standard' : 'enterprise'},
        stripe_subscription_id = ${subscription.id},
        subscription_price = ${pricing.total},
        base_plan_price = ${pricing.subtotal},
        vat_rate = ${pricing.vat.vatRate},
        extra_room_price = ${pricing.extraRoomsPrice ?? 2},
        max_rooms_included = ${planId === 'checkin' ? 0 : planId === 'standard' ? 4 : 6},
        subscription_status = ${subscription.status},
        subscription_current_period_end = ${new Date(subscription.current_period_end * 1000)},
        ads_enabled = ${planId === 'pro' || planId === 'standard' ? false : true},
        legal_module = true,
        status = 'active',
        updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    // Registrar ingreso en tenant_revenues
    await sql`
      INSERT INTO tenant_revenues (
        tenant_id, revenue_type, amount, currency, description,
        stripe_transaction_id, subscription_id
      ) VALUES (
        ${tenantId}::uuid,
        'subscription',
        ${pricing.total},
        'EUR',
        ${`Suscripción ${planId} - ${roomCount} habitaciones`},
        ${subscription.latest_invoice as string || NULL},
        (SELECT id FROM subscriptions WHERE stripe_subscription_id = ${subscription.id} LIMIT 1)
      )
    `;

    console.log(`✅ Suscripción creada: ${subscription.id} para tenant ${tenantId}, plan ${planId}, ${roomCount} habitaciones`);

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      tenant_id: tenantId,
      plan_id: planId,
      room_count: roomCount,
      pricing: {
        base_price: pricing.subtotal,
        vat_rate: pricing.vat.vatRate,
        vat_amount: pricing.vat.vatAmount,
        total: pricing.total,
        currency: 'EUR'
      },
      subscription_status: subscription.status
    });

  } catch (error: any) {
    console.error('❌ Error creando suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

