import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createTenantUser } from '@/lib/tenant';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import { sendOnboardingEmail } from '@/lib/mailer';
import {
  generateReferralCodeForTenant,
  associateTenantWithReferrer,
  getReferrerFromCookie,
} from '@/lib/referrals';
import { parseReferralCookie } from '@/lib/referral-tracking';
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config';

export type WaitlistEntryForActivate = {
  id: string;
  email: string;
  name: string | null;
};

function onboardingPathForLocale(locale: string | undefined): string {
  const loc: Locale = locale && isValidLocale(locale) ? locale : defaultLocale;
  return `/${loc}/onboarding`;
}

/**
 * Activa una fila de waitlist aún no activada: enlaza tenant existente o crea tenant FREE,
 * genera token de onboarding y envía email (variant waitlist_launch).
 * No comprueba activated_at: debe hacerlo el caller.
 */
export async function activateWaitlistEntryFromRow(
  waitlistEntry: WaitlistEntryForActivate,
  req: NextRequest,
  body: Record<string, unknown>,
  options?: { onboardingLocale?: string }
): Promise<NextResponse> {
  const onboardingBasePath = onboardingPathForLocale(options?.onboardingLocale);
  const appBase = String(
    process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'
  ).replace(/\/+$/, '');

  const existingTenant = await sql`
    SELECT id FROM tenants WHERE email = ${waitlistEntry.email} LIMIT 1
  `;

  let tenantId: string;

  if (existingTenant.rows.length > 0) {
    tenantId = existingTenant.rows[0].id;

    await sql`
      UPDATE waitlist
      SET activated_at = NOW(), tenant_id = ${tenantId}
      WHERE id = ${waitlistEntry.id}
    `;

    const existingUser = await sql`
      SELECT id FROM tenant_users
      WHERE tenant_id = ${tenantId} AND email = ${waitlistEntry.email}
      LIMIT 1
    `;

    if (existingUser.rows.length > 0) {
      const onboardingToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      await sql`
        UPDATE tenant_users
        SET
          reset_token = ${onboardingToken},
          reset_token_expires = ${tokenExpiry.toISOString()},
          email_verified = false
        WHERE id = ${existingUser.rows[0].id}
      `;

      const onboardingUrl = `${appBase}${onboardingBasePath}?token=${onboardingToken}&email=${encodeURIComponent(waitlistEntry.email)}`;

      try {
        await sendOnboardingEmail({
          to: waitlistEntry.email,
          onboardingUrl,
          variant: 'waitlist_launch',
        });
      } catch (emailError) {
        console.error('Error enviando email de onboarding:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Usuario ya tenía tenant, se reenvió email de onboarding',
        tenant_id: tenantId,
        email_sent: true,
      });
    }

    const tempPasswordOrphan = crypto.randomBytes(12).toString('base64').slice(0, 16);
    const passwordHashOrphan = await hash(tempPasswordOrphan, 12);
    await createTenantUser({
      tenant_id: tenantId,
      email: waitlistEntry.email,
      password_hash: passwordHashOrphan,
      full_name: waitlistEntry.name || undefined,
      role: 'owner',
    });

    const onboardingTokenOrphan = crypto.randomBytes(32).toString('hex');
    const tokenExpiryOrphan = new Date();
    tokenExpiryOrphan.setHours(tokenExpiryOrphan.getHours() + 24);

    await sql`
      UPDATE tenant_users
      SET
        reset_token = ${onboardingTokenOrphan},
        reset_token_expires = ${tokenExpiryOrphan.toISOString()},
        email_verified = false
      WHERE tenant_id = ${tenantId}::uuid AND email = ${waitlistEntry.email}
    `;

    const onboardingUrlOrphan = `${appBase}${onboardingBasePath}?token=${onboardingTokenOrphan}&email=${encodeURIComponent(waitlistEntry.email)}`;

    try {
      await sendOnboardingEmail({
        to: waitlistEntry.email,
        onboardingUrl: onboardingUrlOrphan,
        tempPassword: tempPasswordOrphan,
        variant: 'waitlist_launch',
      });
      return NextResponse.json({
        success: true,
        message: 'Tenant existente: se creó usuario y se envió email de acceso',
        tenant_id: tenantId,
        email_sent: true,
      });
    } catch (emailError: unknown) {
      const msg = emailError instanceof Error ? emailError.message : String(emailError);
      console.error('Error enviando email de onboarding (tenant sin usuario):', emailError);
      return NextResponse.json({
        success: true,
        message: 'Usuario creado pero error enviando email',
        tenant_id: tenantId,
        email_sent: false,
        email_error: msg,
      });
    }
  }

  const tenantName = waitlistEntry.name || waitlistEntry.email.split('@')[0];
  const tenantConfig = {
    propertyName: tenantName,
    timezone: 'Europe/Madrid',
    language: 'es',
    currency: 'EUR',
  };

  const tenantResult = await sql`
    INSERT INTO tenants (
      name,
      email,
      plan_id,
      plan_type,
      max_rooms,
      current_rooms,
      ads_enabled,
      legal_module,
      onboarding_status,
      status,
      config
    ) VALUES (
      ${tenantName},
      ${waitlistEntry.email},
      'basic',
      'free',
      2,
      0,
      true,
      false,
      'pending',
      'active',
      ${JSON.stringify(tenantConfig)}::jsonb
    ) RETURNING id
  `;

  tenantId = tenantResult.rows[0].id;

  const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
  const passwordHash = await hash(tempPassword, 12);

  await createTenantUser({
    tenant_id: tenantId,
    email: waitlistEntry.email,
    password_hash: passwordHash,
    full_name: waitlistEntry.name || undefined,
    role: 'owner',
  });

  const onboardingToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date();
  tokenExpiry.setHours(tokenExpiry.getHours() + 24);

  await sql`
    UPDATE tenant_users
    SET
      reset_token = ${onboardingToken},
      reset_token_expires = ${tokenExpiry.toISOString()},
      email_verified = false
    WHERE tenant_id = ${tenantId} AND email = ${waitlistEntry.email}
  `;

  await sql`
    UPDATE waitlist
    SET
      activated_at = NOW(),
      tenant_id = ${tenantId}
    WHERE id = ${waitlistEntry.id}
  `;

  try {
    await generateReferralCodeForTenant(tenantId);
  } catch (refError) {
    console.warn('Error generando código de referido:', refError);
  }

  try {
    const referralCookie = req.cookies.get('referral_ref')?.value;

    if (referralCookie) {
      try {
        const cookieData = parseReferralCookie(referralCookie);

        if (cookieData && cookieData.code && tenantId) {
          const referrerTenantId = await getReferrerFromCookie(cookieData);

          if (referrerTenantId && referrerTenantId !== tenantId) {
            const result = await associateTenantWithReferrer(
              tenantId,
              referrerTenantId,
              cookieData.code,
              'free'
            );

            if (result.success) {
              console.log(
                `✅ Tenant asociado con referente: ${tenantId} -> ${referrerTenantId} (${cookieData.code})`
              );
            } else {
              console.warn(`⚠️ No se pudo asociar tenant con referente:`, result.error);
            }
          }
        }
      } catch (cookieError: unknown) {
        const m = cookieError instanceof Error ? cookieError.message : String(cookieError);
        console.warn('Error procesando cookie de referido:', m);
      }
    }

    if (body.referrer_tenant_id && body.referral_code) {
      try {
        await associateTenantWithReferrer(
          tenantId,
          String(body.referrer_tenant_id),
          String(body.referral_code),
          'free'
        );
      } catch (assocError) {
        console.warn('Error asociando tenant con referente desde body:', assocError);
      }
    }
  } catch (referralError: unknown) {
    const m = referralError instanceof Error ? referralError.message : String(referralError);
    console.warn('Error en integración de referidos (no crítico):', m);
  }

  try {
    const affiliateCookie = req.cookies.get('affiliate_ref')?.value;

    if (affiliateCookie) {
      try {
        const cookieData = JSON.parse(affiliateCookie);
        const referralCode = cookieData.code;
        const cookieId = cookieData.cookieId;

        if (referralCode && tenantId) {
          const affiliatesUrl =
            process.env.NEXT_PUBLIC_AFFILIATES_URL || 'https://affiliates.delfincheckin.com';
          const associateResponse = await fetch(`${affiliatesUrl}/api/customers/associate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              referral_code: referralCode,
              cookie_id: cookieId,
              tenant_id: tenantId,
              customer_email: waitlistEntry.email,
              customer_name: waitlistEntry.name || undefined,
            }),
          });

          const associateData = await associateResponse.json();

          if (associateData.success) {
            console.log(`✅ Cliente asociado con afiliado: ${tenantId} -> ${referralCode}`);
          } else {
            console.warn(`⚠️ No se pudo asociar cliente con afiliado:`, associateData.error);
          }
        }
      } catch (cookieError: unknown) {
        const m = cookieError instanceof Error ? cookieError.message : String(cookieError);
        console.warn('Error procesando cookie de afiliado:', m);
      }
    }
  } catch (affiliateError: unknown) {
    const m = affiliateError instanceof Error ? affiliateError.message : String(affiliateError);
    console.warn('Error en integración de afiliados (no crítico):', m);
  }

  const onboardingUrl = `${appBase}${onboardingBasePath}?token=${onboardingToken}&email=${encodeURIComponent(waitlistEntry.email)}`;

  try {
    await sendOnboardingEmail({
      to: waitlistEntry.email,
      onboardingUrl,
      tempPassword,
      variant: 'waitlist_launch',
    });

    console.log(`✅ Usuario activado: ${waitlistEntry.email} -> Tenant ${tenantId}`);

    const payload: Record<string, unknown> = {
      success: true,
      message: 'Usuario activado correctamente',
      tenant_id: tenantId,
      email_sent: true,
    };
    if (process.env.NODE_ENV !== 'production') {
      payload.onboarding_url = onboardingUrl;
    }
    return NextResponse.json(payload);
  } catch (emailError: unknown) {
    const msg = emailError instanceof Error ? emailError.message : String(emailError);
    console.error('Error enviando email de onboarding:', emailError);

    const payload: Record<string, unknown> = {
      success: true,
      message: 'Usuario activado pero error enviando email',
      tenant_id: tenantId,
      email_sent: false,
      email_error: msg,
    };
    if (process.env.NODE_ENV !== 'production') {
      payload.onboarding_url = onboardingUrl;
    }
    return NextResponse.json(payload);
  }
}
