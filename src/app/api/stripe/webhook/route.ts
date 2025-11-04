import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import Stripe from 'stripe'
import bcrypt from 'bcryptjs'
import { 
  ensureTenantTables, 
  createTenant, 
  createTenantUser, 
  findTenantByEmail,
  findTenantByStripeCustomer,
  updateTenantStripeInfo
} from '@/lib/tenant'
import { sendOnboardingEmail } from '@/lib/mailer'
import { 
  handlePaymentFailed, 
  syncStripeInvoice, 
  restoreTenantServices,
  findTenantByStripeCustomerId 
} from '@/lib/payment-tracking'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

async function readRawBody(req: Request): Promise<Buffer> {
const arrayBuffer = await req.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Mapea los planes de pago a los IDs de plan del sistema
 */
function mapPaymentPlanToPlanId(amount: number): 'basic' | 'standard' | 'premium' | 'enterprise' {
  // Mapear montos a planes (en céntimos)
  if (amount <= 1499) return 'basic';      // €14.99 (1 propiedad)
  if (amount <= 2698) return 'standard';   // €26.98 (2 propiedades)  
  if (amount <= 5096) return 'premium';    // €50.96 (4 propiedades)
  return 'enterprise';                     // €149+
}

/**
 * Genera una contraseña temporal segura
 */
function generateTempPassword(): string {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

/**
 * Crea un tenant completo con usuario desde un pago de Stripe
 */
async function resolveEmailFromPaymentIntent(pi: Stripe.PaymentIntent): Promise<string> {
  // 1) Preferir metadata o receipt_email
  let candidate = String(pi.metadata?.email || pi.receipt_email || '')
  if (candidate) return candidate

  // 2) Intentar desde el cargo asociado
  try {
    const expanded = await stripe.paymentIntents.retrieve(pi.id, { expand: ['charges.data.billing_details'] })
    const chargeEmail = expanded.charges?.data?.[0]?.billing_details?.email
    if (chargeEmail) return String(chargeEmail)
  } catch {}

  // 3) Intentar desde el customer
  if (pi.customer) {
    try {
      const customer = await stripe.customers.retrieve(String(pi.customer))
      // @ts-ignore - Stripe types
      if (customer && 'email' in customer && customer.email) {
        return String((customer as any).email)
      }
    } catch {}
  }
  return ''
}

async function createTenantFromPayment(pi: Stripe.PaymentIntent, overrideEmail?: string): Promise<void> {
  const email = overrideEmail || (await resolveEmailFromPaymentIntent(pi))
  const name = String(pi.metadata?.name || (email ? email.split('@')[0] : ''))
  const plan_id = mapPaymentPlanToPlanId(pi.amount)
  
  console.log('🏢 Creando tenant desde pago:', { email, name, plan_id, amount: pi.amount })

  if (!email) {
    console.error('⚠️ No se pudo resolver email del comprador. Abortando envío de onboarding.')
    return
  }

  // Verificar si ya existe un tenant con este email
  const existingTenant = await findTenantByEmail(email)
  if (existingTenant) {
    console.log('⚠️ Tenant ya existe:', existingTenant.id)
    // Actualizar información de Stripe si es necesario
    if (pi.customer) {
      await updateTenantStripeInfo(existingTenant.id, pi.id, 'active')
    }
    return
  }

  try {
    // Asegurar que las tablas existen
    await ensureTenantTables()

    // Crear el tenant
    const tenant = await createTenant({
      name,
      email,
      plan_id,
      stripe_customer_id: String(pi.customer || ''),
      stripe_subscription_id: pi.id,
      config: {
        propertyName: name,
        timezone: 'Europe/Madrid',
        language: 'es',
        currency: 'EUR'
      }
    })

    console.log('✅ Tenant creado:', tenant.id)

    // Generar contraseña temporal
    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    // Crear usuario owner para el tenant
    const user = await createTenantUser({
      tenant_id: tenant.id,
      email,
      password_hash: passwordHash,
      full_name: name,
      role: 'owner'
    })

    console.log('✅ Usuario creado:', user.id)

    // Generar token para onboarding (usar reset_token como token temporal)
    const onboardingToken = Math.random().toString(36).slice(-32) + Math.random().toString(36).slice(-32);
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token válido por 24 horas

    // Actualizar usuario con token de onboarding
    await sql`
      UPDATE tenant_users 
      SET 
        reset_token = ${onboardingToken},
        reset_token_expires = ${tokenExpiry.toISOString()},
        email_verified = false
      WHERE id = ${user.id}
    `;

    // Generar magic link para onboarding
    const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?token=${onboardingToken}&email=${encodeURIComponent(email)}`;
    
    console.log('🔗 Magic link de onboarding:', onboardingUrl);
    console.log('📧 Enviando email de onboarding a:', email);

    // Enviar email real de onboarding (Brevo/SMTP)
    try {
      await sendOnboardingEmail({ to: email, onboardingUrl, tempPassword });
    } catch (mailErr) {
      console.error('✉️ Error enviando email de onboarding:', mailErr);
    }

  } catch (error) {
    console.error('❌ Error creando tenant:', error)
    throw error
  }
}

// Crear tenant usando solo datos del Invoice cuando no hay PaymentIntent accesible
async function createTenantFromInvoice(inv: Stripe.Invoice, email: string): Promise<void> {
  const amount = Number(inv.amount_paid || inv.total || 0)
  const plan_id = mapPaymentPlanToPlanId(amount)
  const name = String((inv.customer_name as string) || (email ? email.split('@')[0] : ''))

  console.log('🏢 Creando tenant desde invoice:', { email, name, plan_id, amount })
  if (!email) {
    console.error('⚠️ Invoice sin email. Abortando envío de onboarding.')
    return
  }

  // Verificar si ya existe un tenant con este email
  const existingTenant = await findTenantByEmail(email)
  if (existingTenant) {
    console.log('⚠️ Tenant ya existe (invoice path):', existingTenant.id)
    return
  }

  // Intentar obtener subscription_id del invoice
  let subscriptionId: string | undefined
  try {
    // @ts-ignore - distintos lugares donde Stripe lo incluye
    subscriptionId = (inv.subscription as string) || (inv.parent?.subscription_details?.subscription as string) || (inv.lines?.data?.[0]?.parent?.subscription_item_details?.subscription as string)
  } catch {}

  try {
    await ensureTenantTables()

    const tenant = await createTenant({
      name,
      email,
      plan_id,
      stripe_customer_id: String(inv.customer || ''),
      stripe_subscription_id: String(subscriptionId || ''),
      config: {
        propertyName: name,
        timezone: 'Europe/Madrid',
        language: 'es',
        currency: 'EUR'
      }
    })

    console.log('✅ Tenant creado (invoice):', tenant.id)

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const user = await createTenantUser({
      tenant_id: tenant.id,
      email,
      password_hash: passwordHash,
      full_name: name,
      role: 'owner'
    })

    console.log('✅ Usuario creado (invoice):', user.id)

    const onboardingToken = Math.random().toString(36).slice(-32) + Math.random().toString(36).slice(-32)
    const tokenExpiry = new Date()
    tokenExpiry.setHours(tokenExpiry.getHours() + 24)

    await sql`
      UPDATE tenant_users 
      SET 
        reset_token = ${onboardingToken},
        reset_token_expires = ${tokenExpiry.toISOString()},
        email_verified = false
      WHERE id = ${user.id}
    `

    const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?token=${onboardingToken}&email=${encodeURIComponent(email)}`
    console.log('🔗 Magic link de onboarding (invoice):', onboardingUrl)
    console.log('📧 Enviando email de onboarding a:', email)
    try {
      await sendOnboardingEmail({ to: email, onboardingUrl, tempPassword })
    } catch (mailErr) {
      console.error('✉️ Error enviando email de onboarding (invoice):', mailErr)
    }

  } catch (error) {
    console.error('❌ Error creando tenant desde invoice:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('stripe-signature') || ''
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return new NextResponse('Webhook sin configurar', { status: 500 })
    }

    const rawBody = await readRawBody(req as unknown as Request)
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      return new NextResponse(`Firma inválida: ${err.message}`, { status: 400 })
    }

    console.log('🔔 Webhook recibido:', event.type)

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'payment_intent.succeeded':
        try {
          const pi = event.data.object as Stripe.PaymentIntent
          // IMPORTANTE: Ignorar pagos de reservas directas (ellos tienen su propio webhook)
          if (pi.metadata?.reservation_id) {
            console.log('ℹ️ Pago de reserva directa detectado, ignorando en webhook de onboarding')
            break
          }
          console.log('✅ Pago exitoso (PI):', { id: pi.id, amount: pi.amount, email: pi.metadata?.email || pi.receipt_email })
          // Disparar onboarding directamente desde el Payment Intent usando metadatos/email
          await createTenantFromPayment(pi)
        } catch (e) {
          console.error('❌ Error procesando payment_intent.succeeded:', e)
        }
        break

      case 'checkout.session.completed':
        // No disparamos onboarding aquí para evitar ambigüedad.
        // El email fiable vendrá en invoice.payment_succeeded.
        console.log('ℹ️ checkout.session.completed recibido (sin onboarding, esperando invoice)')
        break

      case 'invoice.payment_succeeded':
        try {
          const invoice = event.data.object as Stripe.Invoice
          const customerEmail = String(invoice.customer_email || '')
          console.log('📧 Email desde invoice:', customerEmail)
          
          // Si es un tenant existente, restaurar servicios si estaban suspendidos
          if (invoice.customer) {
            const tenant = await findTenantByStripeCustomerId(String(invoice.customer))
            if (tenant) {
              // Restaurar servicios si estaban suspendidos
              await restoreTenantServices(tenant.id)
              // Sincronizar factura
              await syncStripeInvoice(invoice, tenant.id)
              console.log('✅ Pago exitoso - servicios restaurados para tenant:', tenant.id)
            } else {
              // Si no existe, crear nuevo tenant (onboarding)
              await createTenantFromInvoice(invoice, customerEmail)
            }
          } else {
            // Disparar onboarding si no hay customer
            await createTenantFromInvoice(invoice, customerEmail)
          }
        } catch (e) {
          console.error('❌ Error procesando invoice.payment_succeeded:', e)
        }
        break

      case 'invoice.payment_failed':
        try {
          const invoice = event.data.object as Stripe.Invoice
          console.log('❌ Pago fallido para invoice:', invoice.id)
          await handlePaymentFailed(invoice)
        } catch (e) {
          console.error('❌ Error procesando invoice.payment_failed:', e)
        }
        break

      case 'invoice.payment_action_required':
        try {
          const invoice = event.data.object as Stripe.Invoice
          console.log('⚠️ Acción requerida para invoice:', invoice.id)
          // Sincronizar factura y notificar al tenant
          if (invoice.customer) {
            const tenant = await findTenantByStripeCustomerId(String(invoice.customer))
            if (tenant) {
              await syncStripeInvoice(invoice, tenant.id)
            }
          }
        } catch (e) {
          console.error('❌ Error procesando invoice.payment_action_required:', e)
        }
        break

      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription
        console.log('🔄 Suscripción creada:', subscription.id)
        // Actualizar tenant con subscription_id si es necesario
        if (subscription.customer) {
          const tenant = await findTenantByStripeCustomerId(String(subscription.customer))
          if (tenant && !tenant.stripe_subscription_id) {
            await sql`
              UPDATE tenants 
              SET stripe_subscription_id = ${subscription.id},
                  subscription_status = ${subscription.status}
              WHERE id = ${tenant.id}
            `
          }
        }
        break

      case 'customer.subscription.updated':
        try {
          const updatedSub = event.data.object as Stripe.Subscription
          console.log('🔄 Suscripción actualizada:', updatedSub.id, 'Status:', updatedSub.status)
          // Actualizar estado de suscripción del tenant
          if (updatedSub.customer) {
            const tenant = await findTenantByStripeCustomerId(String(updatedSub.customer))
            if (tenant) {
              await sql`
                UPDATE tenants 
                SET subscription_status = ${updatedSub.status}
                WHERE id = ${tenant.id}
              `
              // Si la suscripción está cancelada o unpaid, verificar si necesita suspensión
              if (updatedSub.status === 'unpaid' || updatedSub.status === 'past_due') {
                // Verificar si tiene más de 3 intentos fallidos
                const tenantResult = await sql`
                  SELECT payment_retry_count FROM tenants WHERE id = ${tenant.id}
                `
                const currentRetryCount = tenantResult.rows[0]?.payment_retry_count || 0
                if (currentRetryCount >= 3) {
                  // La suspensión ya debería haberse hecho en handlePaymentFailed
                  console.log('⚠️ Suscripción en estado problemático:', updatedSub.status)
                }
              } else if (updatedSub.status === 'active') {
                // Restaurar servicios si la suscripción vuelve a activa
                await restoreTenantServices(tenant.id)
              }
            }
          }
        } catch (e) {
          console.error('❌ Error procesando customer.subscription.updated:', e)
        }
        break

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object as Stripe.Subscription
        console.log('❌ Suscripción cancelada:', deletedSub.id)
        // Actualizar tenant
        if (deletedSub.customer) {
          const tenant = await findTenantByStripeCustomerId(String(deletedSub.customer))
          if (tenant) {
            await sql`
              UPDATE tenants 
              SET subscription_status = 'canceled',
                  status = 'cancelled'
              WHERE id = ${tenant.id}
            `
          }
        }
        break

      default:
        console.log('ℹ️ Evento no manejado:', event.type)
    }

    return new NextResponse('ok', { status: 200 })
  } catch (error: any) {
    console.error('❌ Error en webhook:', error)
    return new NextResponse(error?.message || 'Error', { status: 500 })
  }
}