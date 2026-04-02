import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';
import { getPendingInvoices } from '@/lib/payment-tracking';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
}) : null;

/**
 * API para obtener información de facturación del tenant
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar que Stripe esté disponible
    if (!stripe) {
      return NextResponse.json({ 
        error: 'Servicio de facturación no disponible - STRIPE_SECRET_KEY no configurada' 
      }, { status: 503 });
    }

    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    // Obtener información del tenant (incluyendo campos de pago)
    const result = await sql`
      SELECT 
        id,
        name,
        email,
        plan_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        subscription_status,
        payment_retry_count,
        last_payment_failed_at,
        last_payment_succeeded_at,
        subscription_suspended_at,
        next_payment_attempt_at,
        created_at
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

    // Mapear plan_id a nombres y precios
    const planDetails: Record<string, { name: string; price: number }> = {
      basic: { name: 'Básico', price: 29 },
      standard: { name: 'Estándar', price: 49 },
      premium: { name: 'Premium', price: 79 },
      enterprise: { name: 'Enterprise', price: 149 },
    };

    const planInfo = planDetails[tenant.plan_id] || planDetails.basic;

    // Obtener facturas pendientes de la base de datos
    const pendingInvoices = await getPendingInvoices(tenantId);

    // Preparar respuesta base
    const billingInfo: any = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        plan_id: tenant.plan_id,
        plan_name: planInfo.name,
        plan_price: planInfo.price,
        status: tenant.status,
        subscription_status: tenant.subscription_status || 'active',
        payment_retry_count: tenant.payment_retry_count || 0,
        last_payment_failed_at: tenant.last_payment_failed_at,
        last_payment_succeeded_at: tenant.last_payment_succeeded_at,
        subscription_suspended_at: tenant.subscription_suspended_at,
        next_payment_attempt_at: tenant.next_payment_attempt_at,
        is_suspended: tenant.status === 'suspended' || (tenant.payment_retry_count || 0) >= 3,
        stripe_customer_id: tenant.stripe_customer_id,
        stripe_subscription_id: tenant.stripe_subscription_id,
        created_at: tenant.created_at,
      },
      invoices: [],
      pending_invoices: pendingInvoices.map(inv => ({
        id: inv.stripe_invoice_id,
        invoice_number: inv.invoice_number,
        amount_due: Number(inv.amount_due),
        amount_paid: Number(inv.amount_paid),
        currency: inv.currency,
        status: inv.status,
        due_date: inv.due_date,
        period_start: inv.period_start,
        period_end: inv.period_end,
        invoice_pdf_url: inv.invoice_pdf_url,
        hosted_invoice_url: inv.hosted_invoice_url,
        attempt_count: inv.attempt_count,
        next_payment_attempt_at: inv.next_payment_attempt_at,
      })),
    };

    // Si tiene Stripe subscription, obtener información adicional
    if (tenant.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        // Obtener información de la suscripción
        const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
        
        billingInfo.subscription = {
          id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        };

        // Obtener facturas del cliente
        if (tenant.stripe_customer_id) {
          const invoices = await stripe.invoices.list({
            customer: tenant.stripe_customer_id,
            limit: 10,
          });

          billingInfo.invoices = invoices.data.map(invoice => ({
            id: invoice.id,
            amount: invoice.amount_paid,
            status: invoice.status,
            date: new Date(invoice.created * 1000).toISOString(),
            invoice_pdf: invoice.invoice_pdf,
          }));
        }
      } catch (stripeError) {
        console.error('Error obteniendo información de Stripe:', stripeError);
        // Continuar sin información de Stripe
      }
    }

    return NextResponse.json(billingInfo);

  } catch (error) {
    console.error('Error obteniendo información de facturación:', error);
    return NextResponse.json(
      { error: 'Error al obtener información de facturación' },
      { status: 500 }
    );
  }
}

