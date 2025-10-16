/**
 * 🔐 API para solicitar recuperación de contraseña
 * 
 * Funcionalidades:
 * - Busca usuario por email
 * - Genera código de recuperación
 * - Envía email con Zoho Mail
 * - No requiere autenticación (para usuarios sin sesión)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendRecoveryEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    // Validar entrada
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email requerido', message: 'El email es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Email inválido', message: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

    // Buscar usuario por email
    const userResult = await sql`
      SELECT 
        tu.id,
        tu.email,
        tu.full_name,
        tu.recovery_email,
        tu.tenant_id,
        t.name as tenant_name
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.email = ${email.toLowerCase()} AND tu.is_active = true
    `;

    if (userResult.rows.length === 0) {
      // Por seguridad, no revelar si el email existe o no
      return NextResponse.json({
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás un código de recuperación'
      });
    }

    const user = userResult.rows[0];

    // Generar código de recuperación
    const recoveryCode = crypto.randomInt(100000, 999999).toString();
    const recoveryTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar código en la base de datos
    await sql`
      UPDATE tenant_users
      SET 
        reset_token = ${recoveryCode}, 
        reset_token_expires = ${recoveryTokenExpires.toISOString()}, 
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Determinar email de destino (recovery_email si existe, sino el email principal)
    const destinationEmail = user.recovery_email || user.email;

    // Enviar email de recuperación
    try {
      await sendRecoveryEmail({
        to: destinationEmail,
        userName: user.full_name || user.email,
        recoveryCode: recoveryCode,
        tenantName: user.tenant_name
      });

      console.log(`✅ Email de recuperación enviado a ${destinationEmail} para usuario ${user.email}`);
    } catch (emailError) {
      console.error('❌ Error enviando email de recuperación:', emailError);
      // No fallar la operación si el email no se puede enviar
    }

    return NextResponse.json({
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un código de recuperación'
    });

  } catch (error) {
    console.error('❌ Error en forgot-password:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
