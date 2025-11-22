import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendOnboardingEmail } from '@/lib/mailer';

/**
 * Endpoint para recuperar el token de onboarding y reenviar el email
 * Útil cuando el email de onboarding no se recibió
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Buscar el tenant y usuario por email
    const result = await sql`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.email,
        t.status,
        tu.id as user_id,
        tu.reset_token,
        tu.reset_token_expires,
        tu.email_verified
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE t.email = ${email}
        AND tu.role = 'owner'
      ORDER BY tu.created_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró ningún tenant con ese email' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // Si el token expiró o no existe, generar uno nuevo
    let onboardingToken = user.reset_token;
    let tokenExpiry = user.reset_token_expires;

    if (!onboardingToken || !tokenExpiry || new Date(tokenExpiry) < new Date()) {
      // Generar nuevo token
      onboardingToken = Math.random().toString(36).slice(-32) + Math.random().toString(36).slice(-32);
      tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Válido por 24 horas

      // Actualizar en la base de datos
      await sql`
        UPDATE tenant_users 
        SET 
          reset_token = ${onboardingToken},
          reset_token_expires = ${tokenExpiry.toISOString()}
        WHERE id = ${user.user_id}
      `;
    }

    // Generar el URL de onboarding
    const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?token=${onboardingToken}&email=${encodeURIComponent(email)}`;

    // Reenviar el email de onboarding
    try {
      await sendOnboardingEmail({ 
        to: email, 
        onboardingUrl,
        // No podemos recuperar la contraseña temporal original, pero el usuario puede usar el magic link
      });
      
      return NextResponse.json({
        success: true,
        message: 'Email de onboarding reenviado correctamente',
        onboardingUrl: onboardingUrl, // Solo para debugging, no debería exponerse en producción
        token: onboardingToken, // Solo para debugging
        note: 'El usuario puede usar el magic link del email para acceder sin contraseña'
      });
    } catch (mailErr: any) {
      console.error('✉️ Error reenviando email de onboarding:', mailErr);
      
      // Aún así devolver el token para que el admin pueda ayudar manualmente
      return NextResponse.json({
        success: false,
        error: 'Error enviando email, pero aquí está el token de onboarding',
        onboardingUrl: onboardingUrl,
        token: onboardingToken,
        emailError: mailErr.message,
        note: 'Puedes compartir este URL con el usuario manualmente'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error recuperando onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para obtener información del onboarding sin reenviar email
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido como query parameter' },
        { status: 400 }
      );
    }

    // Buscar el tenant y usuario por email
    const result = await sql`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.email,
        t.status,
        t.plan_id,
        tu.id as user_id,
        tu.reset_token,
        tu.reset_token_expires,
        tu.email_verified,
        tu.created_at
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE t.email = ${email}
        AND tu.role = 'owner'
      ORDER BY tu.created_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró ningún tenant con ese email' },
        { status: 404 }
      );
    }

    const user = result.rows[0];
    const hasValidToken = user.reset_token && 
                         user.reset_token_expires && 
                         new Date(user.reset_token_expires) > new Date();

    const onboardingUrl = hasValidToken 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?token=${user.reset_token}&email=${encodeURIComponent(email)}`
      : null;

    return NextResponse.json({
      success: true,
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        email: user.email,
        status: user.status,
        plan_id: user.plan_id
      },
      onboarding: {
        hasToken: !!user.reset_token,
        tokenValid: hasValidToken,
        tokenExpires: user.reset_token_expires,
        emailVerified: user.email_verified,
        onboardingUrl: onboardingUrl
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo información de onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

