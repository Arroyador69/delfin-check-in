import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createTenant, createTenantUser } from '@/lib/tenant';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import { sendOnboardingEmail } from '@/lib/mailer';
import { generateReferralCodeForTenant, associateTenantWithReferrer, getReferrerFromCookie } from '@/lib/referrals';
import { parseReferralCookie } from '@/lib/referral-tracking';

/**
 * ========================================
 * ENDPOINT: Activar Usuario de Waitlist
 * ========================================
 * Activa un usuario de la waitlist creando su tenant y enviando email de onboarding
 * 
 * POST /api/superadmin/waitlist/activate
 * Body: { email: string } o { id: string }
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, id } = body;
    
    if (!email && !id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere email o id' },
        { status: 400 }
      );
    }
    
    // Obtener entrada de waitlist
    let waitlistEntry;
    if (id) {
      const result = await sql`
        SELECT id, email, name, created_at, activated_at, tenant_id
        FROM waitlist
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No se encontró la entrada en la waitlist' },
          { status: 404 }
        );
      }
      
      waitlistEntry = result.rows[0];
    } else {
      const result = await sql`
        SELECT id, email, name, created_at, activated_at, tenant_id
        FROM waitlist
        WHERE email = ${email}
        LIMIT 1
      `;
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No se encontró el email en la waitlist' },
          { status: 404 }
        );
      }
      
      waitlistEntry = result.rows[0];
    }
    
    // Verificar si ya está activado
    if (waitlistEntry.activated_at) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este usuario ya está activado',
          alreadyActivated: true,
          tenant_id: waitlistEntry.tenant_id
        },
        { status: 400 }
      );
    }
    
    // Verificar si ya tiene tenant
    const existingTenant = await sql`
      SELECT id FROM tenants WHERE email = ${waitlistEntry.email} LIMIT 1
    `;
    
    let tenantId: string;
    
    if (existingTenant.rows.length > 0) {
      // Ya tiene tenant, usar ese
      tenantId = existingTenant.rows[0].id;
      
      // Marcar como activado en waitlist
      await sql`
        UPDATE waitlist 
        SET activated_at = NOW(), tenant_id = ${tenantId}
        WHERE id = ${waitlistEntry.id}
      `;
      
      // Verificar si tiene usuario
      const existingUser = await sql`
        SELECT id FROM tenant_users 
        WHERE tenant_id = ${tenantId} AND email = ${waitlistEntry.email}
        LIMIT 1
      `;
      
      if (existingUser.rows.length > 0) {
        // Ya tiene usuario, generar nuevo token de onboarding
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
        
        const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/onboarding?token=${onboardingToken}&email=${encodeURIComponent(waitlistEntry.email)}`;
        
        // Enviar email de onboarding
        try {
          await sendOnboardingEmail({
            to: waitlistEntry.email,
            onboardingUrl,
            // No enviamos contraseña temporal si ya existe usuario
          });
        } catch (emailError) {
          console.error('Error enviando email de onboarding:', emailError);
          // Continuar aunque falle el email
        }
        
        return NextResponse.json({
          success: true,
          message: 'Usuario ya tenía tenant, se reenvió email de onboarding',
          tenant_id: tenantId,
          email_sent: true
        });
      }
    } else {
      // Crear nuevo tenant con plan FREE directamente con SQL para incluir plan_type desde el inicio
      const tenantName = waitlistEntry.name || waitlistEntry.email.split('@')[0];
      const tenantConfig = {
        propertyName: tenantName,
        timezone: 'Europe/Madrid',
        language: 'es',
        currency: 'EUR'
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
          'basic', -- plan_id para compatibilidad
          'free', -- plan_type para el nuevo sistema
          2, -- max_rooms para plan FREE
          0, -- current_rooms inicial
          true, -- ads_enabled para plan FREE
          false, -- legal_module deshabilitado en FREE
          'pending', -- onboarding_status
          'active', -- status
          ${JSON.stringify(tenantConfig)}::jsonb
        ) RETURNING id
      `;
      
      tenantId = tenantResult.rows[0].id;
      
      // Generar contraseña temporal
      const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
      const passwordHash = await hash(tempPassword, 12);
      
      // Crear usuario
      await createTenantUser({
        tenant_id: tenantId,
        email: waitlistEntry.email,
        password_hash: passwordHash,
        full_name: waitlistEntry.name || undefined,
        role: 'owner'
      });
      
      // Generar token de onboarding
      const onboardingToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);
      
      // Actualizar usuario con token
      await sql`
        UPDATE tenant_users
        SET 
          reset_token = ${onboardingToken},
          reset_token_expires = ${tokenExpiry.toISOString()},
          email_verified = false
        WHERE tenant_id = ${tenantId} AND email = ${waitlistEntry.email}
      `;
      
      // Marcar como activado en waitlist
      await sql`
        UPDATE waitlist
        SET 
          activated_at = NOW(),
          tenant_id = ${tenantId}
        WHERE id = ${waitlistEntry.id}
      `;
      
      // Generar código de referido para el nuevo tenant
      try {
        await generateReferralCodeForTenant(tenantId);
      } catch (refError) {
        console.warn('Error generando código de referido:', refError);
        // No es crítico, continuar
      }
      
      // Intentar asociar con referente si viene de un referido
      // Nota: En este endpoint no tenemos acceso a la cookie, pero podemos verificar si viene en el body
      if (body.referrer_tenant_id && body.referral_code) {
        try {
          await associateTenantWithReferrer(
            tenantId,
            body.referrer_tenant_id,
            body.referral_code,
            'free' // Plan inicial
          );
        } catch (assocError) {
          console.warn('Error asociando tenant con referente:', assocError);
          // No es crítico, continuar
        }
      }

      // =====================================================
      // INTEGRACIÓN CON SISTEMA DE AFILIADOS
      // =====================================================
      try {
        // Leer cookie de afiliado desde el request
        const affiliateCookie = req.cookies.get('affiliate_ref')?.value;
        
        if (affiliateCookie) {
          try {
            const cookieData = JSON.parse(affiliateCookie);
            const referralCode = cookieData.code;
            const cookieId = cookieData.cookieId;

            if (referralCode && tenantId) {
              // Llamar a la API de afiliados para asociar
              const affiliatesUrl = process.env.NEXT_PUBLIC_AFFILIATES_URL || 'https://affiliates.delfincheckin.com';
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
          } catch (cookieError: any) {
            console.warn('Error procesando cookie de afiliado:', cookieError.message);
            // No fallar el proceso si la cookie es inválida
          }
        }
      } catch (affiliateError: any) {
        console.warn('Error en integración de afiliados (no crítico):', affiliateError.message);
        // No fallar el proceso si falla la asociación de afiliado
      }
      
      // Generar URL de onboarding
      const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/onboarding?token=${onboardingToken}&email=${encodeURIComponent(waitlistEntry.email)}`;
      
      // Enviar email de onboarding
      try {
        await sendOnboardingEmail({
          to: waitlistEntry.email,
          onboardingUrl,
          tempPassword
        });
        
        console.log(`✅ Usuario activado: ${waitlistEntry.email} -> Tenant ${tenantId}`);
        
        return NextResponse.json({
          success: true,
          message: 'Usuario activado correctamente',
          tenant_id: tenantId,
          email_sent: true,
          onboarding_url: onboardingUrl // Solo para debugging
        });
      } catch (emailError: any) {
        console.error('Error enviando email de onboarding:', emailError);
        
        // Aún así devolver éxito porque el tenant fue creado
        return NextResponse.json({
          success: true,
          message: 'Usuario activado pero error enviando email',
          tenant_id: tenantId,
          email_sent: false,
          email_error: emailError.message,
          onboarding_url: onboardingUrl // Para que el admin pueda compartirlo manualmente
        });
      }
    }
    
  } catch (error: any) {
    console.error('Error activando usuario de waitlist:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al activar usuario',
        details: error.message
      },
      { status: 500 }
    );
  }
}
