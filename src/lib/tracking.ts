/**
 * 📊 SISTEMA DE TRACKING
 * Funciones helper para registrar actividad, emails, funnels, etc.
 */

import { sql } from '@/lib/db'

/**
 * Registra actividad de usuario (para DAU/WAU/MAU)
 */
export async function trackUserActivity(params: {
  tenantId: string
  userId?: string
  activityType: 'login' | 'checkin' | 'xml_sent' | 'property_created' | 'reservation_created' | 'offline_mode' | string
  activityData?: any
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  try {
    await sql`
      INSERT INTO user_activity (
        tenant_id, user_id, activity_type, activity_data, ip_address, user_agent
      )
      VALUES (
        ${params.tenantId},
        ${params.userId || null},
        ${params.activityType},
        ${params.activityData ? JSON.stringify(params.activityData) : null},
        ${params.ipAddress || null},
        ${params.userAgent || null}
      )
    `
  } catch (error) {
    // No fallar si hay error en tracking (no crítico)
    console.error('⚠️ Error tracking user activity:', error)
  }
}

/**
 * Registra un evento de funnel
 */
export async function trackFunnelEvent(params: {
  tenantId: string
  eventType: 'signup' | 'property_created' | 'first_checkin' | 'xml_sent' | 'payment'
  eventData?: any
  stepNumber: number
  timeToComplete?: number // segundos desde el paso anterior
}): Promise<void> {
  try {
    await sql`
      INSERT INTO funnel_events (
        tenant_id, event_type, event_data, step_number, time_to_complete
      )
      VALUES (
        ${params.tenantId},
        ${params.eventType},
        ${params.eventData ? JSON.stringify(params.eventData) : null},
        ${params.stepNumber},
        ${params.timeToComplete ? `${params.timeToComplete} seconds` : null}
      )
    `
  } catch (error) {
    console.error('⚠️ Error tracking funnel event:', error)
  }
}

/**
 * Registra tracking de email
 */
export async function trackEmail(params: {
  tenantId?: string
  emailType: 'onboarding' | 'legal_notice' | 'upsell' | 'incident' | 'custom'
  recipientEmail: string
  subject: string
  messageId?: string
  status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
  metadata?: any
}): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO email_tracking (
        tenant_id, email_type, recipient_email, subject, message_id, status, metadata
      )
      VALUES (
        ${params.tenantId || null},
        ${params.emailType},
        ${params.recipientEmail},
        ${params.subject},
        ${params.messageId || null},
        ${params.status || 'sent'},
        ${params.metadata ? JSON.stringify(params.metadata) : null}
      )
      RETURNING id
    `
    return result.rows[0]?.id
  } catch (error) {
    console.error('⚠️ Error tracking email:', error)
    return ''
  }
}

/**
 * Actualiza el estado de un email (opened, clicked)
 */
export async function updateEmailTracking(params: {
  emailId: string
  status: 'opened' | 'clicked'
  clickUrl?: string
}): Promise<void> {
  try {
    if (params.status === 'opened') {
      await sql`
        UPDATE email_tracking
        SET 
          status = 'opened',
          opened_at = NOW(),
          opened_count = opened_count + 1,
          updated_at = NOW()
        WHERE id = ${params.emailId}
      `
    } else if (params.status === 'clicked') {
      await sql`
        UPDATE email_tracking
        SET 
          status = 'clicked',
          clicked_at = NOW(),
          clicked_count = clicked_count + 1,
          click_url = ${params.clickUrl || null},
          updated_at = NOW()
        WHERE id = ${params.emailId}
      `
    }
  } catch (error) {
    console.error('⚠️ Error updating email tracking:', error)
  }
}

/**
 * Registra tracking de XML/MIR
 */
export async function trackXmlSend(params: {
  tenantId?: string
  propertyId?: string
  guestRegistrationId?: string
  xmlType: 'PV' | 'RH' | 'both'
  sentTo: 'MIR' | 'SES' | 'both'
  status: 'pending' | 'sent' | 'delivered' | 'error' | 'retry'
  sentAt?: Date
  deliveredAt?: Date
  errorMessage?: string
  retryCount?: number
  timeToSend?: number // segundos desde check-in
  metadata?: any
}): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO xml_tracking (
        tenant_id, property_id, guest_registration_id, xml_type, sent_to,
        status, sent_at, delivered_at, error_message, retry_count,
        time_to_send, metadata
      )
      VALUES (
        ${params.tenantId || null},
        ${params.propertyId || null},
        ${params.guestRegistrationId || null},
        ${params.xmlType},
        ${params.sentTo},
        ${params.status},
        ${params.sentAt || null},
        ${params.deliveredAt || null},
        ${params.errorMessage || null},
        ${params.retryCount || 0},
        ${params.timeToSend ? `${params.timeToSend} seconds` : null},
        ${params.metadata ? JSON.stringify(params.metadata) : null}
      )
      RETURNING id
    `
    return result.rows[0]?.id
  } catch (error) {
    console.error('⚠️ Error tracking XML:', error)
    return ''
  }
}

/**
 * Registra un evento de suscripción/pago
 */
export async function trackSubscriptionEvent(params: {
  tenantId: string
  eventType: 'subscription_started' | 'subscription_upgraded' | 'subscription_downgraded' | 'subscription_cancelled' | 'payment_received'
  planType: 'free' | 'free_legal' | 'pro'
  amount: number
  currency?: string
  paymentMethod?: string
  stripeInvoiceId?: string
  periodStart: Date
  periodEnd?: Date
  metadata?: any
}): Promise<void> {
  try {
    await sql`
      INSERT INTO subscription_events (
        tenant_id, event_type, plan_type, amount, currency, payment_method,
        stripe_invoice_id, period_start, period_end, metadata
      )
      VALUES (
        ${params.tenantId},
        ${params.eventType},
        ${params.planType},
        ${params.amount},
        ${params.currency || 'EUR'},
        ${params.paymentMethod || null},
        ${params.stripeInvoiceId || null},
        ${params.periodStart},
        ${params.periodEnd || null},
        ${params.metadata ? JSON.stringify(params.metadata) : null}
      )
    `
  } catch (error) {
    console.error('⚠️ Error tracking subscription event:', error)
  }
}

