import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * API para cancelar la suscripción del tenant
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

    // Obtener información del tenant
    const result = await sql`
      SELECT 
        id,
        stripe_subscription_id,
        status
      FROM tenants 
      WHERE id = ${tenantId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const tenant = result.rows[0];

    if (!tenant.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No hay suscripción activa para cancelar' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe no está configurado' },
        { status: 500 }
      );
    }

    // Cancelar la suscripción al final del período
    const subscription = await stripe.subscriptions.update(
      tenant.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    console.log(`🔴 Suscripción marcada para cancelación: ${tenant.stripe_subscription_id}`);

    // Actualizar estado del tenant (opcional - mantener activo hasta el final del período)
    await sql`
      UPDATE tenants
      SET updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Suscripción cancelada. Tu acceso continuará hasta el final del período actual.',
      cancel_at: new Date(subscription.current_period_end * 1000).toISOString(),
    });

  } catch (error: any) {
    console.error('Error cancelando suscripción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cancelar la suscripción' },
      { status: 500 }
    );
  }
}

