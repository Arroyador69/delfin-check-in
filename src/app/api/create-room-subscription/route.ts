import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Calcular precio por habitación según volumen
 */
function getRoomPrice(roomCount: number): number {
  if (roomCount === 1) return 14.99;
  if (roomCount === 2) return 13.49;
  if (roomCount >= 3 && roomCount <= 4) return 12.74;
  if (roomCount >= 5 && roomCount <= 9) return 11.99;
  if (roomCount >= 10) return 11.24;
  return 14.99;
}

/**
 * Calcular precio total según número de habitaciones y tipo de plan
 */
function calculateTotalPrice(roomCount: number, isYearly: boolean): { monthly: number; total: number; savings?: number } {
  const pricePerRoom = getRoomPrice(roomCount);
  const monthlyTotal = roomCount * pricePerRoom;
  
  if (isYearly) {
    const yearlyTotal = monthlyTotal * 12;
    const annualDiscount = yearlyTotal * 0.167; // 16.7% descuento
    const finalPrice = yearlyTotal - annualDiscount;
    const savings = yearlyTotal - finalPrice;
    
    return {
      monthly: monthlyTotal,
      total: finalPrice,
      savings
    };
  }
  
  return {
    monthly: monthlyTotal,
    total: monthlyTotal
  };
}

/**
 * POST - Crear suscripción basada en número de habitaciones
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      roomCount, 
      isYearly, 
      email, 
      name, 
      paymentMethodId,
      tenantId 
    } = body;

    // Validar datos
    if (!roomCount || roomCount < 1) {
      return NextResponse.json({ error: 'Número de habitaciones inválido' }, { status: 400 });
    }

    if (!email || !name) {
      return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 });
    }

    // Calcular precio total
    const { total, monthly, savings } = calculateTotalPrice(roomCount, isYearly);
    
    // Convertir a céntimos
    const amountInCents = Math.round(total * 100);

    // Buscar tenant por email o ID
    let tenant;
    
    // Intentar obtener tenant del header (para usuarios autenticados)
    const reqTenantId = req.headers.get('x-tenant-id');
    
    if (reqTenantId) {
      const tenantResult = await sql`
        SELECT * FROM tenants WHERE id = ${reqTenantId}
      `;
      
      if (tenantResult.rows.length > 0) {
        tenant = tenantResult.rows[0];
      }
    }
    
    // Si no se encontró, buscar por email
    if (!tenant) {
      const tenantResult = await sql`
        SELECT * FROM tenants WHERE email = ${email} LIMIT 1
      `;
      
      if (tenantResult.rows.length > 0) {
        tenant = tenantResult.rows[0];
      }
    }

    // Si no existe tenant, crearlo
    if (!tenant) {
      const newTenantResult = await sql`
        INSERT INTO tenants (name, email, plan_id, max_rooms, current_rooms, status)
        VALUES (${name}, ${email}, 'basic', ${roomCount}, ${roomCount}, 'active')
        RETURNING *
      `;
      tenant = newTenantResult.rows[0];
    }

    // Gestionar customer de Stripe
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
        WHERE id = ${tenant.id}
      `;
    }

    // Si hay payment method, attacharlo
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Crear price en Stripe
    const productName = `Delfín Check-in - ${roomCount} ${roomCount === 1 ? 'habitación' : 'habitaciones'}${isYearly ? ' (Anual)' : ' (Mensual)'}`;
    
    const price = await stripe.prices.create({
      unit_amount: amountInCents,
      currency: 'eur',
      recurring: { 
        interval: isYearly ? 'year' : 'month' 
      },
      product_data: {
        name: productName,
      },
    });

    // Si el tenant ya tiene una suscripción, actualizarla
    let subscription;
    
    if (tenant.stripe_subscription_id) {
      const existingSubscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
      
      subscription = await stripe.subscriptions.update(
        tenant.stripe_subscription_id,
        {
          items: [{
            id: existingSubscription.items.data[0].id,
            price: price.id,
          }],
          proration_behavior: 'always_invoice',
          metadata: {
            tenant_id: tenant.id,
            room_count: roomCount.toString(),
            is_yearly: isYearly.toString(),
            discount_applied: savings ? savings.toFixed(2) : '0'
          },
        }
      );
    } else {
      // Crear nueva suscripción
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        metadata: {
          tenant_id: tenant.id,
          room_count: roomCount.toString(),
          is_yearly: isYearly.toString(),
          discount_applied: savings ? savings.toFixed(2) : '0'
        },
      });
    }

    // Actualizar tenant en la base de datos
    await sql`
      UPDATE tenants
      SET 
        stripe_subscription_id = ${subscription.id},
        max_rooms = ${roomCount},
        current_rooms = ${roomCount},
        status = 'active',
        updated_at = NOW()
      WHERE id = ${tenant.id}
    `;

    console.log(`✅ Suscripción creada/actualizada para tenant ${tenant.id}: ${roomCount} habitaciones, ${isYearly ? 'anual' : 'mensual'}`);

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      tenant_id: tenant.id,
      room_count: roomCount,
      amount: total,
      monthly_amount: monthly,
      savings: savings || 0,
      interval: isYearly ? 'year' : 'month'
    });

  } catch (error: any) {
    console.error('Error creando suscripción por habitaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
