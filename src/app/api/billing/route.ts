import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';
import { getPendingInvoices } from '@/lib/payment-tracking';
import { getTenantById } from '@/lib/tenant';
import type { Tenant } from '@/lib/tenant';
import { getTenantPlanPresentation } from '@/lib/tenant-plan-billing';
import { getTenantBusinessCurrency, getTenantMoneyFormatLocale } from '@/lib/tenant-currency';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })
  : null;

/**
 * API para obtener información de facturación del tenant
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'No se pudo identificar el tenant' }, { status: 400 });
    }

    const tenant = await getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const t = tenant as Tenant & { lodging_id?: string | null };
    const lodgingId =
      t.lodging_id && String(t.lodging_id).trim() !== ''
        ? String(t.lodging_id)
        : String(tenant.id);

    const roomsResult = await sql`
      SELECT id
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
    `;
    const roomsUsed = roomsResult.rows.length;

    const presentation = await getTenantPlanPresentation(tenant as Tenant, roomsUsed);
    const pendingInvoices = await getPendingInvoices(tenantId);

    const periodEndDb = tenant.subscription_current_period_end
      ? new Date(tenant.subscription_current_period_end).toISOString()
      : null;

    const billingInfo: Record<string, unknown> = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        plan_id: tenant.plan_id,
        plan_type: presentation.effective_plan_type,
        plan_name: presentation.plan_name,
        status: tenant.status,
        subscription_status: tenant.subscription_status || 'active',
        payment_retry_count: tenant.payment_retry_count || 0,
        last_payment_failed_at: tenant.last_payment_failed_at,
        last_payment_succeeded_at: tenant.last_payment_succeeded_at,
        subscription_suspended_at: tenant.subscription_suspended_at,
        next_payment_attempt_at: tenant.next_payment_attempt_at,
        is_suspended:
          tenant.status === 'suspended' || (tenant.payment_retry_count || 0) >= 3,
        stripe_customer_id: tenant.stripe_customer_id,
        stripe_subscription_id: tenant.stripe_subscription_id,
        polar_customer_id: (tenant as any).polar_customer_id || null,
        polar_subscription_id: (tenant as any).polar_subscription_id || null,
        polar_subscription_status: (tenant as any).polar_subscription_status || null,
        polar_checkout_id: (tenant as any).polar_checkout_id || null,
        polar_last_event_at: (tenant as any).polar_last_event_at || null,
        created_at: tenant.created_at,
      },
      plan: {
        effective_type: presentation.effective_plan_type,
        billing_rooms: presentation.billing_rooms,
        price_ex_vat: presentation.plan_price_ex_vat,
        vat_rate: presentation.plan_vat_rate,
        vat_amount: presentation.plan_vat_amount,
        price_total: presentation.plan_price_total,
        features: presentation.plan_features,
      },
      invoices: [] as unknown[],
      pending_invoices: pendingInvoices.map((inv) => ({
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
      mor_provider: 'polar',
    };

    let subscriptionPayload: {
      id: string;
      status: string;
      current_period_start: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
      billing_interval: 'month' | 'year' | null;
    } | null = null;

    if (tenant.stripe_subscription_id && stripe) {
      try {
        const subscription = (await stripe.subscriptions.retrieve(
          tenant.stripe_subscription_id
        )) as unknown as {
          id: string;
          status: string;
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
          items?: { data?: Array<{ price?: { recurring?: { interval?: string | null } | null } | null }> };
        };
        const firstItem = subscription.items?.data?.[0];
        const recurring = firstItem?.price?.recurring;
        const billingInterval =
          recurring?.interval === 'year'
            ? 'year'
            : recurring?.interval === 'month'
              ? 'month'
              : null;

        subscriptionPayload = {
          id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          billing_interval: billingInterval,
        };
      } catch (stripeError) {
        console.error('Error obteniendo información de Stripe:', stripeError);
      }
    }

    if (!subscriptionPayload && periodEndDb && tenant.stripe_subscription_id) {
      subscriptionPayload = {
        id: tenant.stripe_subscription_id,
        status: tenant.subscription_status || 'active',
        current_period_start: null,
        current_period_end: periodEndDb,
        cancel_at_period_end: false,
        billing_interval: null,
      };
    }

    if (subscriptionPayload) {
      billingInfo.subscription = subscriptionPayload;
    }

    // Stripe invoice history: mantener solo como compatibilidad/commission history,
    // pero el plan SaaS es MoR (Polar).
    if (tenant.stripe_customer_id && stripe) {
      try {
        const invoices = await stripe.invoices.list({
          customer: tenant.stripe_customer_id,
          limit: 10,
        });

        billingInfo.invoices = invoices.data.map((invoice) => ({
          id: invoice.id,
          amount: invoice.amount_paid,
          status: invoice.status,
          date: new Date(invoice.created * 1000).toISOString(),
          invoice_pdf: invoice.invoice_pdf,
        }));
      } catch (e) {
        console.error('Error listando facturas Stripe:', e);
      }
    }

    return NextResponse.json({
      ...billingInfo,
      business_currency: getTenantBusinessCurrency(tenant),
      money_format_locale: getTenantMoneyFormatLocale(tenant),
    });
  } catch (error) {
    console.error('Error obteniendo información de facturación:', error);
    return NextResponse.json(
      { error: 'Error al obtener información de facturación' },
      { status: 500 }
    );
  }
}
