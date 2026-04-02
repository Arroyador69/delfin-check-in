import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import Stripe from 'stripe';
import { findTenantByStripeCustomerId } from '@/lib/payment-tracking';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
}) : null;

/**
 * POST - Obtener URL de pago para una factura pendiente
 * Este endpoint valida la factura y devuelve la URL de Stripe para pagarla
 */
export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Servicio de facturación no disponible - STRIPE_SECRET_KEY no configurada' },
        { status: 503 }
      );
    }

    // Obtener tenant_id del header
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'invoice_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la factura pertenece al tenant
    const invoiceResult = await sql`
      SELECT * FROM stripe_invoices 
      WHERE stripe_invoice_id = ${invoice_id}
      AND tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Factura no encontrada o no pertenece a tu cuenta' },
        { status: 404 }
      );
    }

    const dbInvoice = invoiceResult.rows[0];

    // Obtener la factura de Stripe
    try {
      const stripeInvoice = await stripe.invoices.retrieve(invoice_id);

      // Si la factura ya está pagada, devolver información
      if (stripeInvoice.status === 'paid') {
        return NextResponse.json({
          success: true,
          message: 'La factura ya está pagada',
          invoice: {
            id: stripeInvoice.id,
            status: stripeInvoice.status,
            amount_paid: stripeInvoice.amount_paid / 100,
            hosted_invoice_url: stripeInvoice.hosted_invoice_url,
          }
        });
      }

      // Si la factura está en estado 'open' o 'uncollectible', devolver URL de pago
      if (stripeInvoice.status === 'open' || stripeInvoice.status === 'uncollectible') {
        // Si tiene hosted_invoice_url, usarla directamente
        if (stripeInvoice.hosted_invoice_url) {
          return NextResponse.json({
            success: true,
            payment_url: stripeInvoice.hosted_invoice_url,
            invoice: {
              id: stripeInvoice.id,
              status: stripeInvoice.status,
              amount_due: stripeInvoice.amount_due / 100,
              currency: stripeInvoice.currency,
              due_date: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000).toISOString() : null,
            }
          });
        }

        // Si no tiene URL, intentar crear una sesión de pago
        // O simplemente devolver el invoice_pdf o la URL de checkout
        return NextResponse.json({
          success: true,
          message: 'Factura encontrada. Usa el enlace de pago proporcionado.',
          invoice: {
            id: stripeInvoice.id,
            status: stripeInvoice.status,
            amount_due: stripeInvoice.amount_due / 100,
            currency: stripeInvoice.currency,
            invoice_pdf: stripeInvoice.invoice_pdf,
          },
          payment_url: stripeInvoice.invoice_pdf || null,
        });
      }

      // Para otros estados (draft, void), devolver error
      return NextResponse.json(
        { error: `La factura está en estado ${stripeInvoice.status} y no puede ser pagada` },
        { status: 400 }
      );

    } catch (stripeError: any) {
      console.error('Error obteniendo factura de Stripe:', stripeError);
      
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Factura no encontrada en Stripe' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Error al obtener información de la factura desde Stripe' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error en pay-invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener información de una factura pendiente
 */
export async function GET(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Servicio de facturación no disponible' },
        { status: 503 }
      );
    }

    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const invoice_id = searchParams.get('invoice_id');

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'invoice_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la factura pertenece al tenant
    const invoiceResult = await sql`
      SELECT * FROM stripe_invoices 
      WHERE stripe_invoice_id = ${invoice_id}
      AND tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    const dbInvoice = invoiceResult.rows[0];

    // Obtener la factura de Stripe
    try {
      const stripeInvoice = await stripe.invoices.retrieve(invoice_id);

      return NextResponse.json({
        success: true,
        invoice: {
          id: stripeInvoice.id,
          number: stripeInvoice.number,
          status: stripeInvoice.status,
          amount_due: stripeInvoice.amount_due / 100,
          amount_paid: stripeInvoice.amount_paid / 100,
          currency: stripeInvoice.currency,
          due_date: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000).toISOString() : null,
          period_start: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000).toISOString() : null,
          period_end: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000).toISOString() : null,
          hosted_invoice_url: stripeInvoice.hosted_invoice_url,
          invoice_pdf: stripeInvoice.invoice_pdf,
          attempt_count: stripeInvoice.attempt_count,
          next_payment_attempt: stripeInvoice.next_payment_attempt ? new Date(stripeInvoice.next_payment_attempt * 1000).toISOString() : null,
        }
      });
    } catch (stripeError: any) {
      console.error('Error obteniendo factura de Stripe:', stripeError);
      
      return NextResponse.json(
        { error: 'Error al obtener información de la factura desde Stripe' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error en pay-invoice GET:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

