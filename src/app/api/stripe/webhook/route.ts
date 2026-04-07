import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import Stripe from 'stripe'
import bcrypt from 'bcryptjs'
import { 
  ensureTenantTables, 
  createTenant, 
  createTenantUser, 
  getTenantById,
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
import { getStripeServer } from '@/lib/stripe-server'
import { calculatePlanPriceWithInterval, type BillingInterval, type PlanId } from '@/lib/plan-pricing'

export const config = {
  api: {
    bodyParser: false,
  },
}

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
    const expanded = await getStripeServer().paymentIntents.retrieve(pi.id, { expand: ['charges.data.billing_details'] })
    const chargeEmail = expanded.charges?.data?.[0]?.billing_details?.email
    if (chargeEmail) return String(chargeEmail)
  } catch {}

  // 3) Intentar desde el customer
  if (pi.customer) {
    try {
      const customer = await getStripeServer().customers.retrieve(String(pi.customer))
      // @ts-ignore - Stripe types
      if (customer && 'email' in customer && customer.email) {
        return String((customer as any).email)
      }
    } catch {}
  }
  return ''
}

async function createTenantFromPayment(pi: Stripe.PaymentIntent, overrideEmail?: string): Promise<void> {
  console.log('🔍 [CREATE TENANT] Iniciando creación de tenant desde Payment Intent:', pi.id)
  console.log('🔍 [CREATE TENANT] Metadatos del Payment Intent:', {
    email: pi.metadata?.email,
    name: pi.metadata?.name,
    planId: pi.metadata?.planId,
    properties: pi.metadata?.properties,
    receipt_email: pi.receipt_email,
    customer: pi.customer
  })
  
  const email = overrideEmail || (await resolveEmailFromPaymentIntent(pi))
  const name = String(pi.metadata?.name || (email ? email.split('@')[0] : ''))
  const plan_id = mapPaymentPlanToPlanId(pi.amount)
  
  console.log('🏢 [CREATE TENANT] Datos resueltos:', { email, name, plan_id, amount: pi.amount })

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

    // Generar código de referido para el nuevo tenant
    try {
      const { generateReferralCodeForTenant } = await import('@/lib/referrals');
      await generateReferralCodeForTenant(tenant.id);
      console.log('✅ Código de referido generado para tenant:', tenant.id);
    } catch (refError) {
      console.warn('⚠️ Error generando código de referido:', refError);
      // No es crítico, continuar
    }

    // Intentar asociar con referente si hay referral_code en metadatos de Stripe
    // Nota: La asociación principal se hará en onboarding/complete cuando haya cookie
    try {
      if (pi.metadata?.referral_code) {
        const { associateTenantWithReferrer } = await import('@/lib/referrals');
        const { getTenantIdFromReferralCode } = await import('@/lib/referral-tracking');
        const referrerTenantId = await getTenantIdFromReferralCode(pi.metadata.referral_code);
        
        if (referrerTenantId && referrerTenantId !== tenant.id) {
          const planType = (plan_id === 'checkin' ? 'checkin' : plan_id === 'pro' ? 'pro' : 'free') as 'free' | 'checkin' | 'pro';
          await associateTenantWithReferrer(tenant.id, referrerTenantId, pi.metadata.referral_code, planType);
          console.log('✅ Tenant asociado con referente desde metadatos Stripe:', referrerTenantId);
        }
      }
    } catch (refError) {
      console.warn('⚠️ Error asociando referido desde metadatos Stripe:', refError);
      // No es crítico, se asociará en onboarding si hay cookie
    }

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
      const emailResult = await sendOnboardingEmail({ to: email, onboardingUrl, tempPassword });
      console.log('✅ [WEBHOOK] Email de onboarding enviado exitosamente:', emailResult);
    } catch (mailErr: any) {
      // Log detallado del error
      console.error('❌ [WEBHOOK] Error CRÍTICO enviando email de onboarding:', {
        error: mailErr.message,
        stack: mailErr.stack,
        code: mailErr.code,
        to: email,
        onboardingUrl: onboardingUrl,
        // Verificar configuración SMTP
        smtpHost: process.env.SMTP_HOST || '❌ NO CONFIGURADO',
        smtpUser: process.env.SMTP_USER || '❌ NO CONFIGURADO',
        smtpPass: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD) ? '✅ Configurado' : '❌ NO CONFIGURADO',
        smtpFrom: process.env.SMTP_FROM_ONBOARDING || process.env.SMTP_FROM || '❌ NO CONFIGURADO'
      });
      
      // IMPORTANTE: No lanzar el error para que el webhook se complete exitosamente
      // El tenant ya fue creado, solo falló el envío del email
      // El usuario puede usar el endpoint /api/admin/recover-onboarding para obtener el token
      console.warn('⚠️ [WEBHOOK] Tenant creado pero email no enviado. El usuario puede usar /api/admin/recover-onboarding para obtener el token.');
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

    // Generar código de referido para el nuevo tenant
    try {
      const { generateReferralCodeForTenant } = await import('@/lib/referrals');
      await generateReferralCodeForTenant(tenant.id);
      console.log('✅ Código de referido generado para tenant (invoice):', tenant.id);
    } catch (refError) {
      console.warn('⚠️ Error generando código de referido (invoice):', refError);
      // No es crítico, continuar
    }

    // Intentar asociar con referente si hay referral_code en metadatos de Stripe
    // Nota: La asociación principal se hará en onboarding/complete cuando haya cookie
    try {
      if (inv.metadata?.referral_code) {
        const { associateTenantWithReferrer } = await import('@/lib/referrals');
        const { getTenantIdFromReferralCode } = await import('@/lib/referral-tracking');
        const referrerTenantId = await getTenantIdFromReferralCode(inv.metadata.referral_code);
        
        if (referrerTenantId && referrerTenantId !== tenant.id) {
          const planType = (plan_id === 'checkin' ? 'checkin' : plan_id === 'pro' ? 'pro' : 'free') as 'free' | 'checkin' | 'pro';
          await associateTenantWithReferrer(tenant.id, referrerTenantId, inv.metadata.referral_code, planType);
          console.log('✅ Tenant asociado con referente desde metadatos Stripe (invoice):', referrerTenantId);
        }
      }
    } catch (refError) {
      console.warn('⚠️ Error asociando referido desde metadatos Stripe (invoice):', refError);
      // No es crítico, se asociará en onboarding si hay cookie
    }

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
      const emailResult = await sendOnboardingEmail({ to: email, onboardingUrl, tempPassword })
      console.log('✅ [WEBHOOK INVOICE] Email de onboarding enviado exitosamente:', emailResult)
    } catch (mailErr: any) {
      console.error('❌ [WEBHOOK INVOICE] Error CRÍTICO enviando email de onboarding:', {
        error: mailErr.message,
        stack: mailErr.stack,
        code: mailErr.code,
        to: email,
        onboardingUrl: onboardingUrl,
        smtpHost: process.env.SMTP_HOST || '❌ NO CONFIGURADO',
        smtpUser: process.env.SMTP_USER || '❌ NO CONFIGURADO',
        smtpPass: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD) ? '✅ Configurado' : '❌ NO CONFIGURADO',
        smtpFrom: process.env.SMTP_FROM_ONBOARDING || process.env.SMTP_FROM || '❌ NO CONFIGURADO'
      })
      console.warn('⚠️ [WEBHOOK INVOICE] Tenant creado pero email no enviado. El usuario puede usar /api/admin/recover-onboarding para obtener el token.')
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
      event = getStripeServer().webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      return new NextResponse(`Firma inválida: ${err.message}`, { status: 400 })
    }

    console.log('🔔 [WEBHOOK ONBOARDING] Webhook recibido:', event.type)
    console.log('🔔 [WEBHOOK ONBOARDING] Event ID:', event.id)
    console.log('🔔 [WEBHOOK ONBOARDING] Livemode:', event.livemode)

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'payment_intent.succeeded':
        try {
          const pi = event.data.object as Stripe.PaymentIntent
          console.log('🔔 [WEBHOOK ONBOARDING] Payment Intent recibido:', {
            id: pi.id,
            amount: pi.amount,
            metadata: pi.metadata,
            receipt_email: pi.receipt_email,
            customer: pi.customer
          })
          
          // IMPORTANTE: Ignorar pagos de reservas directas (ellos tienen su propio webhook)
          if (pi.metadata?.reservation_id || pi.metadata?.source === 'direct_reservation') {
            console.log('ℹ️ [WEBHOOK ONBOARDING] Pago de reserva directa detectado, ignorando en webhook de onboarding')
            break
          }
          
          console.log('✅ [WEBHOOK ONBOARDING] Pago exitoso (PI):', { 
            id: pi.id, 
            amount: pi.amount, 
            email: pi.metadata?.email || pi.receipt_email,
            name: pi.metadata?.name,
            planId: pi.metadata?.planId
          })
          
          // Disparar onboarding directamente desde el Payment Intent usando metadatos/email
          await createTenantFromPayment(pi)
          console.log('✅ [WEBHOOK ONBOARDING] Procesamiento completado para Payment Intent:', pi.id)
        } catch (e) {
          console.error('❌ [WEBHOOK ONBOARDING] Error procesando payment_intent.succeeded:', e)
          console.error('❌ [WEBHOOK ONBOARDING] Stack trace:', e instanceof Error ? e.stack : 'No stack trace')
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
              
              // Manejar referidos: actualizar estado y recalcular recompensas
              try {
                const { handleReferralPaymentSucceeded } = await import('@/lib/referral-webhooks');
                const { applyCreditsBeforePayment } = await import('@/lib/referral-credits');
                
                // Aplicar créditos antes del cobro (si aplica)
                await applyCreditsBeforePayment(tenant.id);
                
                // Manejar referido si es referido de alguien
                await handleReferralPaymentSucceeded(tenant.id, invoice);
              } catch (refError) {
                console.warn('⚠️ Error manejando referidos en pago exitoso:', refError);
                // No es crítico, continuar
              }
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
          
          // Manejar referidos: actualizar estado y notificar
          if (invoice.customer) {
            try {
              const tenant = await findTenantByStripeCustomerId(String(invoice.customer))
              if (tenant) {
                const { handleReferralPaymentFailed } = await import('@/lib/referral-webhooks');
                await handleReferralPaymentFailed(tenant.id);
              }
            } catch (refError) {
              console.warn('⚠️ Error manejando referidos en pago fallido:', refError);
              // No es crítico, continuar
            }
          }
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
        try {
          const subscription = event.data.object as Stripe.Subscription
          console.log('🔄 [WEBHOOK] Suscripción creada:', subscription.id)
          
          const tenantId = subscription.metadata?.tenant_id;
          if (tenantId) {
            // Actualizar suscripción en BD si existe
            await sql`
              UPDATE subscriptions
              SET 
                status = ${subscription.status},
                current_period_start = ${new Date(subscription.current_period_start * 1000)},
                current_period_end = ${new Date(subscription.current_period_end * 1000)},
                updated_at = NOW()
              WHERE stripe_subscription_id = ${subscription.id}
            `;
            
            // Actualizar tenant
            await sql`
              UPDATE tenants
              SET 
                subscription_status = ${subscription.status},
                subscription_current_period_end = ${new Date(subscription.current_period_end * 1000)},
                updated_at = NOW()
              WHERE id = ${tenantId}::uuid
            `;
            
            console.log(`✅ [WEBHOOK] Suscripción ${subscription.id} sincronizada para tenant ${tenantId}`);
          } else if (subscription.customer) {
            // Fallback al método antiguo si no hay metadata
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
        } catch (e) {
          console.error('❌ Error procesando customer.subscription.created:', e)
        }
        break

      case 'customer.subscription.updated':
        try {
          const updatedSub = event.data.object as Stripe.Subscription
          console.log('🔄 Suscripción actualizada:', updatedSub.id, 'Status:', updatedSub.status)
          // Actualizar estado de suscripción del tenant + sincronizar pricing/flags
          const planFromMetadata = (updatedSub.metadata?.plan_id || updatedSub.metadata?.plan_type || '') as string
          const planId: PlanId =
            planFromMetadata === 'checkin' || planFromMetadata === 'check-in'
              ? 'checkin'
              : planFromMetadata === 'standard'
                ? 'standard'
                : planFromMetadata === 'pro'
                  ? 'pro'
                  : 'free'

          const roomCount = Math.max(1, parseInt(String(updatedSub.metadata?.room_count || '1'), 10) || 1)
          const intervalMeta = String(updatedSub.metadata?.billing_interval || 'month').toLowerCase()
          const billingInterval: BillingInterval = intervalMeta === 'year' || intervalMeta === 'annual' || intervalMeta === 'yearly' ? 'year' : 'month'

          let tenant = null as any
          if (updatedSub.metadata?.tenant_id) {
            tenant = await getTenantById(String(updatedSub.metadata.tenant_id))
          } else if (updatedSub.customer) {
            tenant = await findTenantByStripeCustomerId(String(updatedSub.customer))
          }

          if (tenant) {
            const pricing = await calculatePlanPriceWithInterval(
              planId,
              roomCount,
              billingInterval,
              tenant.country_code || 'ES'
            )

            const adsEnabled = planId === 'free' || planId === 'checkin'
            const legalModule = planId !== 'free'
            const maxRoomsIncluded = planId === 'free' ? 2 : 1

            // Upsert suscripción
            await sql`
              INSERT INTO subscriptions (
                tenant_id, plan_id, stripe_subscription_id, stripe_customer_id,
                status, current_period_start, current_period_end,
                base_price, vat_rate, vat_amount, total_price, currency,
                room_count, extra_rooms_price, metadata
              ) VALUES (
                ${tenant.id}::uuid,
                ${planId},
                ${updatedSub.id},
                ${String(updatedSub.customer || '')},
                ${updatedSub.status},
                ${new Date(updatedSub.current_period_start * 1000)},
                ${new Date(updatedSub.current_period_end * 1000)},
                ${pricing.subtotal},
                ${pricing.vat.vatRate},
                ${pricing.vat.vatAmount},
                ${pricing.total},
                'EUR',
                ${roomCount},
                ${pricing.extraRoomsPrice || 0},
                ${JSON.stringify(updatedSub.metadata || {})}::jsonb
              )
              ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                status = EXCLUDED.status,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                base_price = EXCLUDED.base_price,
                vat_rate = EXCLUDED.vat_rate,
                vat_amount = EXCLUDED.vat_amount,
                total_price = EXCLUDED.total_price,
                room_count = EXCLUDED.room_count,
                extra_rooms_price = EXCLUDED.extra_rooms_price,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            `

            // Actualizar tenant
            await sql`
              UPDATE tenants 
              SET 
                subscription_status = ${updatedSub.status},
                stripe_subscription_id = ${updatedSub.id},
                subscription_current_period_end = ${new Date(updatedSub.current_period_end * 1000)},
                plan_type = ${planId},
                plan_id = ${planId},
                subscription_price = ${pricing.total},
                base_plan_price = ${pricing.subtotal},
                vat_rate = ${pricing.vat.vatRate},
                extra_room_price = ${planId === 'free' ? null : 2},
                max_rooms_included = ${maxRoomsIncluded},
                ads_enabled = ${adsEnabled},
                legal_module = ${legalModule},
                status = 'active',
                updated_at = NOW()
              WHERE id = ${tenant.id}
            `
              
              // Manejar referidos: actualizar estado según plan
              try {
                const { handleReferralPlanUpdated } = await import('@/lib/referral-webhooks');
                await handleReferralPlanUpdated(tenant.id, planId as 'free' | 'checkin' | 'standard' | 'pro');
              } catch (refError) {
                console.warn('⚠️ Error manejando referidos en actualización de suscripción:', refError);
                // No es crítico, continuar
              }
              
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
        } catch (e) {
          console.error('❌ Error procesando customer.subscription.updated:', e)
        }
        break

      case 'customer.subscription.deleted':
        try {
          const deletedSub = event.data.object as Stripe.Subscription
          console.log('❌ [WEBHOOK] Suscripción cancelada:', deletedSub.id)
          
          const tenantId = deletedSub.metadata?.tenant_id;
          if (tenantId) {
            // Actualizar suscripción en BD
            await sql`
              UPDATE subscriptions
              SET 
                status = 'canceled',
                canceled_at = NOW(),
                updated_at = NOW()
              WHERE stripe_subscription_id = ${deletedSub.id}
            `;
            
            // Downgrade tenant a plan gratis
            await sql`
              UPDATE tenants
              SET 
                plan_type = 'free',
                plan_id = 'free',
                subscription_status = 'canceled',
                subscription_price = NULL,
                base_plan_price = 0.00,
                extra_room_price = NULL,
                max_rooms_included = 1,
                ads_enabled = true,
                legal_module = false,
                max_rooms = 1,
                updated_at = NOW()
              WHERE id = ${tenantId}::uuid
            `;
            
            console.log(`✅ [WEBHOOK] Tenant ${tenantId} downgradeado a plan gratis`);
            
            // Manejar referidos: marcar como cancelado y revocar recompensas
            try {
              const { handleReferralCancelled } = await import('@/lib/referral-webhooks');
              await handleReferralCancelled(tenantId);
            } catch (refError) {
              console.warn('⚠️ Error manejando referidos en cancelación:', refError);
              // No es crítico, continuar
            }
          } else if (deletedSub.customer) {
            // Fallback al método antiguo
            const tenant = await findTenantByStripeCustomerId(String(deletedSub.customer))
            if (tenant) {
              await sql`
                UPDATE tenants 
                SET subscription_status = 'canceled',
                    status = 'cancelled'
                WHERE id = ${tenant.id}
              `
              
              // Manejar referidos
              try {
                const { handleReferralCancelled } = await import('@/lib/referral-webhooks');
                await handleReferralCancelled(tenant.id);
              } catch (refError) {
                console.warn('⚠️ Error manejando referidos en cancelación:', refError);
              }
            }
          }
        } catch (e) {
          console.error('❌ Error procesando customer.subscription.deleted:', e)
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