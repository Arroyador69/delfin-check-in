import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createTenant, createTenantUser } from '@/lib/tenant';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import { sendOnboardingEmail } from '@/lib/mailer';

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
      // Crear nuevo tenant con plan FREE (usamos 'basic' para createTenant que tiene max_rooms = 2)
      const tenant = await createTenant({
        name: waitlistEntry.name || waitlistEntry.email.split('@')[0],
        email: waitlistEntry.email,
        plan_id: 'basic', // 'basic' tiene max_rooms = 2, que es lo que queremos para FREE
        config: {}
      });
      
      tenantId = tenant.id;
      
      // Actualizar tenant con flags del nuevo sistema (plan_type = 'free', pero plan_id = 'basic')
      await sql`
        UPDATE tenants
        SET 
          plan_type = 'free',
          ads_enabled = true,
          legal_module = false,
          max_rooms = 2,
          current_rooms = 0,
          onboarding_status = 'pending',
          status = 'active'
        WHERE id = ${tenantId}
      `;
      
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
