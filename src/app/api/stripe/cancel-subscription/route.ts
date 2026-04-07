/**
 * ========================================
 * API: Cancelar Suscripción Stripe
 * ========================================
 * Cancela suscripción y downgrade a plan gratis
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantById } from '@/lib/tenant';
import { getStripeServer } from '@/lib/stripe-server';

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
    const { cancelImmediately = false } = body; // Si true, cancela ahora; si false, al final del período

    // Obtener tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    if (!tenant.stripe_subscription_id) {
      return NextResponse.json(
        { success: false, error: 'No se encontró suscripción activa' },
        { status: 404 }
      );
    }

    // Cancelar suscripción en Stripe
    let canceledSubscription;
    
    if (cancelImmediately) {
      // Cancelar inmediatamente
      canceledSubscription = await getStripeServer().subscriptions.cancel(tenant.stripe_subscription_id);
    } else {
      // Cancelar al final del período actual
      canceledSubscription = await getStripeServer().subscriptions.update(
        tenant.stripe_subscription_id,
        {
          cancel_at_period_end: true,
        }
      );
    }

    // Actualizar suscripción en BD
    await sql`
      UPDATE subscriptions
      SET 
        status = ${canceledSubscription.status},
        cancel_at_period_end = ${canceledSubscription.cancel_at_period_end || false},
        canceled_at = ${canceledSubscription.canceled_at ? new Date(canceledSubscription.canceled_at * 1000) : NULL},
        updated_at = NOW()
      WHERE stripe_subscription_id = ${tenant.stripe_subscription_id}
    `;

    // Si se cancela inmediatamente, downgrade a plan gratis
    if (cancelImmediately) {
      await sql`
        UPDATE tenants
        SET 
          plan_type = 'free',
          plan_id = 'free',
          subscription_price = NULL,
          base_plan_price = 0.00,
          extra_room_price = NULL,
          max_rooms_included = 1,
          subscription_status = 'canceled',
          ads_enabled = true,
          legal_module = false,
          max_rooms = 1,
          updated_at = NOW()
        WHERE id = ${tenantId}
      `;
    } else {
      // Solo marcar que se cancelará al final del período
      await sql`
        UPDATE tenants
        SET 
          subscription_status = 'active', -- Sigue activa hasta el final
          updated_at = NOW()
        WHERE id = ${tenantId}
      `;
    }

    console.log(`✅ Suscripción ${cancelImmediately ? 'cancelada' : 'programada para cancelar'}: ${tenant.stripe_subscription_id}`);

    return NextResponse.json({
      success: true,
      subscription_id: canceledSubscription.id,
      canceled_immediately: cancelImmediately,
      cancel_at_period_end: canceledSubscription.cancel_at_period_end,
      current_period_end: canceledSubscription.current_period_end 
        ? new Date(canceledSubscription.current_period_end * 1000).toISOString()
        : null,
      message: cancelImmediately 
        ? 'Suscripción cancelada. Has sido cambiado al Plan Gratis.'
        : 'Suscripción programada para cancelar al final del período actual.'
    });

  } catch (error: any) {
    console.error('❌ Error cancelando suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

