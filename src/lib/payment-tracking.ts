import { sql } from '@/lib/db';
import Stripe from 'stripe';
import { sendPaymentNotificationEmail } from './mailer';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
}) : null;

/**
 * Encuentra un tenant por stripe_customer_id
 */
export async function findTenantByStripeCustomerId(customerId: string) {
  const result = await sql`
    SELECT * FROM tenants 
    WHERE stripe_customer_id = ${customerId}
    LIMIT 1
  `;
  return result.rows[0] || null;
}

/**
 * Registra un intento de pago fallido
 */
export async function recordPaymentAttempt(
  tenantId: string,
  invoice: Stripe.Invoice,
  attemptNumber: number,
  status: 'pending' | 'succeeded' | 'failed' | 'canceled',
  failureReason?: string,
  failureCode?: string
) {
  const amount = Number(invoice.amount_due) / 100; // Convertir de céntimos a euros
  
  await sql`
    INSERT INTO payment_attempts (
      tenant_id, stripe_invoice_id, stripe_payment_intent_id,
      attempt_number, amount, currency, status, failure_reason, failure_code
    )
    VALUES (
      ${tenantId}, ${invoice.id}, ${(invoice as any).payment_intent || null},
      ${attemptNumber}, ${amount}, ${invoice.currency || 'eur'}, ${status},
      ${failureReason || null}, ${failureCode || null}
    )
    ON CONFLICT (tenant_id, stripe_invoice_id, attempt_number) 
    DO UPDATE SET
      status = ${status},
      failure_reason = ${failureReason || null},
      failure_code = ${failureCode || null},
      updated_at = NOW()
  `;
}

/**
 * Sincroniza una factura de Stripe con la base de datos
 */
export async function syncStripeInvoice(invoice: Stripe.Invoice, tenantId: string) {
  const amountDue = Number(invoice.amount_due) / 100;
  const amountPaid = Number(invoice.amount_paid) / 100;
  
  await sql`
    INSERT INTO stripe_invoices (
      tenant_id, stripe_invoice_id, stripe_customer_id, stripe_subscription_id,
      invoice_number, amount_due, amount_paid, currency, status,
      due_date, period_start, period_end,       invoice_pdf_url, hosted_invoice_url,
      attempt_count, next_payment_attempt
    )
    VALUES (
      ${tenantId}, ${invoice.id}, ${String(invoice.customer || '')}, 
      ${(invoice as any).subscription ? String((invoice as any).subscription) : null},
      ${invoice.number || null}, ${amountDue}, ${amountPaid}, 
      ${invoice.currency || 'eur'}, ${invoice.status},
      ${invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null},
      ${invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null},
      ${invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null},
      ${invoice.invoice_pdf || null}, ${invoice.hosted_invoice_url || null},
      ${invoice.attempt_count || 0},
      ${invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null}
    )
    ON CONFLICT (stripe_invoice_id) 
    DO UPDATE SET
      status = ${invoice.status},
      amount_due = ${amountDue},
      amount_paid = ${amountPaid},
      attempt_count = ${invoice.attempt_count || 0},
      next_payment_attempt = ${invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null},
      hosted_invoice_url = ${invoice.hosted_invoice_url || null},
      updated_at = NOW()
  `;
}

/**
 * Maneja un pago fallido
 */
export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.customer) {
    console.error('❌ Invoice sin customer:', invoice.id);
    return;
  }

  const customerId = String(invoice.customer);
  const tenant = await findTenantByStripeCustomerId(customerId);

  if (!tenant) {
    console.error('❌ Tenant no encontrado para customer:', customerId);
    return;
  }

  const tenantId = tenant.id;
  const attemptCount = invoice.attempt_count || 0;
  const retryCount = (tenant.payment_retry_count || 0) + 1;

  // Registrar el intento de pago fallido
  await recordPaymentAttempt(
    tenantId,
    invoice,
    attemptCount,
    'failed',
    (invoice as any).last_payment_error?.message || 'Pago fallido',
    (invoice as any).last_payment_error?.code || 'unknown'
  );

  // Sincronizar factura
  await syncStripeInvoice(invoice, tenantId);

  // Actualizar estado del tenant
  await sql`
    UPDATE tenants 
    SET 
      payment_retry_count = ${retryCount},
      last_payment_failed_at = NOW(),
      subscription_status = ${invoice.status === 'uncollectible' ? 'unpaid' : 'past_due'},
      last_invoice_id = ${invoice.id},
      next_payment_attempt_at = ${invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null}
    WHERE id = ${tenantId}
  `;

  // Si es el tercer intento fallido, suspender servicios
  if (retryCount >= 3) {
    await suspendTenantServices(tenantId, invoice);
  } else {
    // Enviar email de advertencia
    await sendPaymentFailureNotification(tenant, invoice, retryCount);
  }

  console.log(`⚠️ Pago fallido para tenant ${tenantId}, intento ${retryCount}/3`);
}

/**
 * Suspende los servicios de un tenant después de 3 intentos fallidos
 */
export async function suspendTenantServices(tenantId: string, invoice: Stripe.Invoice) {
  await sql`
    UPDATE tenants 
    SET 
      status = 'suspended',
      subscription_status = 'past_due',
      subscription_suspended_at = NOW()
    WHERE id = ${tenantId}
  `;

  // Obtener tenant actualizado para enviar email
  const tenantResult = await sql`
    SELECT * FROM tenants WHERE id = ${tenantId}
  `;
  const tenant = tenantResult.rows[0];

  // Enviar email de suspensión
  await sendSuspensionNotification(tenant, invoice);
  
  console.log(`🚫 Servicios suspendidos para tenant ${tenantId}`);
}

/**
 * Restaura servicios cuando el pago es exitoso
 */
export async function restoreTenantServices(tenantId: string) {
  await sql`
    UPDATE tenants 
    SET 
      status = 'active',
      subscription_status = 'active',
      payment_retry_count = 0,
      last_payment_succeeded_at = NOW(),
      subscription_suspended_at = NULL,
      next_payment_attempt_at = NULL
    WHERE id = ${tenantId}
  `;

  console.log(`✅ Servicios restaurados para tenant ${tenantId}`);
}

/**
 * Envía email de notificación de pago fallido
 */
async function sendPaymentFailureNotification(tenant: any, invoice: Stripe.Invoice, retryCount: number) {
  try {
    const amount = Number(invoice.amount_due) / 100;
    const remainingAttempts = 3 - retryCount;

    await sql`
      INSERT INTO payment_notifications (
        tenant_id, notification_type, email_address, subject, metadata
      )
      VALUES (
        ${tenant.id}, 'payment_failed', ${tenant.email},
        'Pago fallido - Delfín Check-in', 
        ${JSON.stringify({ invoice_id: invoice.id, retry_count: retryCount, amount })}
      )
    `;

    // Enviar email usando el mailer
    await sendPaymentNotificationEmail({
      to: tenant.email,
      type: 'payment_failed',
      tenantName: tenant.name,
      amount,
      retryCount,
      remainingAttempts,
      invoiceUrl: invoice.hosted_invoice_url || null,
    });

    await sql`
      UPDATE payment_notifications 
      SET email_sent = true, email_sent_at = NOW()
      WHERE tenant_id = ${tenant.id} 
      AND notification_type = 'payment_failed'
      AND created_at = (SELECT MAX(created_at) FROM payment_notifications WHERE tenant_id = ${tenant.id})
    `;
  } catch (error) {
    console.error('❌ Error enviando email de pago fallido:', error);
  }
}

/**
 * Envía email de notificación de suspensión
 */
async function sendSuspensionNotification(tenant: any, invoice: Stripe.Invoice) {
  try {
    const amount = Number(invoice.amount_due) / 100;

    await sql`
      INSERT INTO payment_notifications (
        tenant_id, notification_type, email_address, subject, metadata
      )
      VALUES (
        ${tenant.id}, 'suspended', ${tenant.email},
        'Servicios suspendidos - Delfín Check-in', 
        ${JSON.stringify({ invoice_id: invoice.id, amount })}
      )
    `;

    await sendPaymentNotificationEmail({
      to: tenant.email,
      type: 'suspended',
      tenantName: tenant.name,
      amount,
      invoiceUrl: invoice.hosted_invoice_url || null,
    });

    await sql`
      UPDATE payment_notifications 
      SET email_sent = true, email_sent_at = NOW()
      WHERE tenant_id = ${tenant.id} 
      AND notification_type = 'suspended'
      AND created_at = (SELECT MAX(created_at) FROM payment_notifications WHERE tenant_id = ${tenant.id})
    `;
  } catch (error) {
    console.error('❌ Error enviando email de suspensión:', error);
  }
}

/**
 * Obtiene facturas pendientes de un tenant
 */
export async function getPendingInvoices(tenantId: string) {
  const result = await sql`
    SELECT * FROM stripe_invoices 
    WHERE tenant_id = ${tenantId} 
    AND status IN ('open', 'uncollectible')
    ORDER BY due_date DESC, created_at DESC
  `;
  return result.rows;
}

/**
 * Verifica si un tenant tiene servicios activos
 */
export async function isTenantActive(tenantId: string): Promise<boolean> {
  const result = await sql`
    SELECT status, subscription_status, payment_retry_count 
    FROM tenants 
    WHERE id = ${tenantId}
  `;
  
  if (result.rows.length === 0) return false;
  
  const tenant = result.rows[0];
  
  // Si está suspendido o tiene más de 3 intentos fallidos, no está activo
  if (tenant.status === 'suspended' || tenant.subscription_status === 'unpaid') {
    return false;
  }
  
  // Si tiene más de 3 intentos fallidos, no está activo
  if (tenant.payment_retry_count >= 3) {
    return false;
  }
  
  return tenant.status === 'active' || tenant.status === 'trial';
}

