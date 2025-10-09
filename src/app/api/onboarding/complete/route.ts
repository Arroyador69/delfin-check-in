import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * API para completar el proceso de onboarding
 * Actualiza la configuración del tenant y marca el email como verificado
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      token, 
      email, 
      propertyName,
      timezone,
      language,
      currency,
      contactEmail,
      contactPhone,
      address,
      city,
      postalCode,
      country
    } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token y email son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el token es válido
    const verifyResult = await sql`
      SELECT 
        t.*,
        tu.id as user_id,
        tu.reset_token,
        tu.reset_token_expires,
        tu.email_verified
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE t.email = ${email} 
        AND tu.reset_token = ${token}
        AND tu.reset_token_expires > NOW()
        AND tu.email_verified = false
    `;

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Token inválido, expirado o ya utilizado' },
        { status: 404 }
      );
    }

    const tenant = verifyResult.rows[0];

    // Actualizar la configuración del tenant
    const updatedConfig = {
      propertyName: propertyName || tenant.config?.propertyName || '',
      timezone: timezone || tenant.config?.timezone || 'Europe/Madrid',
      language: language || tenant.config?.language || 'es',
      currency: currency || tenant.config?.currency || 'EUR',
      contactEmail: contactEmail || tenant.email,
      contactPhone: contactPhone || '',
      address: address || '',
      city: city || '',
      postalCode: postalCode || '',
      country: country || 'España'
    };

    // Actualizar el tenant con la nueva configuración
    await sql`
      UPDATE tenants 
      SET 
        name = ${propertyName || tenant.name},
        config = ${JSON.stringify(updatedConfig)},
        status = 'active',
        updated_at = NOW()
      WHERE id = ${tenant.id}
    `;

    // Generar una nueva contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Actualizar el usuario: marcar email como verificado y actualizar contraseña
    await sql`
      UPDATE tenant_users 
      SET 
        email_verified = true,
        password_hash = ${passwordHash},
        reset_token = NULL,
        reset_token_expires = NULL,
        updated_at = NOW()
      WHERE id = ${tenant.user_id}
    `;

    // TODO: Enviar email con las credenciales temporales
    console.log('📧 Credenciales temporales para', email, ':', tempPassword);

    // Log de auditoría
    console.log(`✅ Onboarding completado para tenant ${tenant.id} (${propertyName})`);

    return NextResponse.json({
      success: true,
      message: 'Onboarding completado correctamente',
      tenant: {
        id: tenant.id,
        name: propertyName || tenant.name,
        email: tenant.email,
        plan_id: tenant.plan_id,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error completando onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
