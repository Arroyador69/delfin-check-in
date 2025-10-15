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

async function createTenantFromPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const email = await resolveEmailFromPaymentIntent(pi)
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
        const pi = event.data.object as Stripe.PaymentIntent
        console.log('✅ Pago exitoso:', { 
          id: pi.id, 
          amount: pi.amount, 
          email: pi.metadata?.email || pi.receipt_email 
        })
        
        // Crear tenant automáticamente
        await createTenantFromPayment(pi)
        break

      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription
        console.log('🔄 Suscripción creada:', subscription.id)
        // TODO: Manejar creación de suscripción
        break

      case 'customer.subscription.updated':
        const updatedSub = event.data.object as Stripe.Subscription
        console.log('🔄 Suscripción actualizada:', updatedSub.id)
        // TODO: Manejar actualización de suscripción
        break

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object as Stripe.Subscription
        console.log('❌ Suscripción cancelada:', deletedSub.id)
        // TODO: Manejar cancelación de suscripción
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