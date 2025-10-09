import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const PLAN_PRICES: Record<string, { amount: number; max_rooms: number }> = {
  basic: { amount: 2900, max_rooms: 2 },
  standard: { amount: 4900, max_rooms: 4 },
  premium: { amount: 7900, max_rooms: 6 },
  enterprise: { amount: 14900, max_rooms: -1 }
};

/**
 * API para procesar upgrade/downgrade de plan
 */
export async function POST(req: NextRequest) {
  try {
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { planId, paymentMethodId } = body;

    if (!planId || !PLAN_PRICES[planId]) {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe no está configurado' },
        { status: 500 }
      );
    }

    // Obtener información del tenant
    const tenantResult = await sql`
      SELECT 
        id,
        email,
        name,
        plan_id,
        stripe_customer_id,
        stripe_subscription_id
      FROM tenants 
      WHERE id = ${tenantId}
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];
    const newPlanInfo = PLAN_PRICES[planId];

    // Caso 1: Tenant no tiene suscripción de Stripe (crear nueva)
    if (!tenant.stripe_subscription_id || !tenant.stripe_customer_id) {
      
      // Crear customer si no existe
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
        
        // Actualizar tenant con customer_id
        await sql`
          UPDATE tenants
          SET stripe_customer_id = ${customerId}
          WHERE id = ${tenantId}
        `;
      }

      // Attach payment method al customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Configurar como método de pago por defecto
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Crear price en Stripe (o usar price_id existente)
      const price = await stripe.prices.create({
        unit_amount: newPlanInfo.amount,
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: {
          name: `Delfín Check-in - Plan ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
        },
      });

      // Crear suscripción
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        metadata: {
          tenant_id: tenant.id,
          plan_id: planId,
        },
      });

      // Actualizar tenant
      await sql`
        UPDATE tenants
        SET 
          plan_id = ${planId},
          max_rooms = ${newPlanInfo.max_rooms},
          stripe_subscription_id = ${subscription.id},
          status = 'active',
          updated_at = NOW()
        WHERE id = ${tenantId}
      `;

      console.log(`✅ Nueva suscripción creada para tenant ${tenantId}: ${subscription.id}`);

      return NextResponse.json({
        success: true,
        message: 'Plan actualizado correctamente',
        subscription_id: subscription.id,
      });
    }

    // Caso 2: Tenant tiene suscripción existente (actualizar)
    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);

    if (!subscription || subscription.items.data.length === 0) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      );
    }

    // Crear nuevo price
    const newPrice = await stripe.prices.create({
      unit_amount: newPlanInfo.amount,
      currency: 'eur',
      recurring: { interval: 'month' },
      product_data: {
        name: `Delfín Check-in - Plan ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
      },
    });

    // Actualizar suscripción
    const updatedSubscription = await stripe.subscriptions.update(
      tenant.stripe_subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: newPrice.id,
        }],
        proration_behavior: 'always_invoice', // Facturar inmediatamente la diferencia
        metadata: {
          tenant_id: tenant.id,
          plan_id: planId,
        },
      }
    );

    // Actualizar tenant en la base de datos
    await sql`
      UPDATE tenants
      SET 
        plan_id = ${planId},
        max_rooms = ${newPlanInfo.max_rooms},
        status = 'active',
        updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    console.log(`✅ Suscripción actualizada para tenant ${tenantId}: ${planId}`);

    return NextResponse.json({
      success: true,
      message: 'Plan actualizado correctamente',
      subscription_id: updatedSubscription.id,
    });

  } catch (error: any) {
    console.error('Error procesando upgrade:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar el cambio de plan' },
      { status: 500 }
    );
  }
}

