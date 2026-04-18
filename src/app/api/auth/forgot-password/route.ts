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
import { getClientIP, rateLimitMiddleware, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req.headers);
  const rl = rateLimitMiddleware(`pw-recovery:${clientIP}`, RATE_LIMIT_CONFIGS.login);
  if (rl) return rl;

  try {
    console.log('🔍 Iniciando forgot-password para:', req.url);
    const { email } = await req.json();
    console.log('📧 Email recibido:', email);
    
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

    // Buscar usuario por email (consulta simplificada)
    let userResult;
    try {
      console.log('🔍 Ejecutando consulta SQL...');
      userResult = await sql`
        SELECT 
          tu.id,
          tu.email,
          tu.full_name,
          tu.tenant_id,
          t.name as tenant_name
        FROM tenant_users tu
        JOIN tenants t ON tu.tenant_id = t.id
        WHERE tu.email = ${email.toLowerCase()} AND tu.is_active = true
      `;
      console.log('✅ Consulta SQL exitosa');
    } catch (sqlError) {
      console.error('❌ Error en consulta SQL:', sqlError);
      throw new Error(`Error de base de datos: ${sqlError.message}`);
    }

    console.log('👤 Usuarios encontrados:', userResult.rows.length);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No se encontró usuario para email:', email);
      // Por seguridad, no revelar si el email existe o no
      return NextResponse.json({
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás un código de recuperación'
      });
    }

    const user = userResult.rows[0];
    console.log('✅ Usuario encontrado:', user.email);

    // Generar código de recuperación
    const recoveryCode = crypto.randomInt(100000, 999999).toString();
    const recoveryTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar código en la base de datos
    try {
      console.log('💾 Guardando código de recuperación...');
      await sql`
        UPDATE tenant_users
        SET 
          reset_token = ${recoveryCode}, 
          reset_token_expires = ${recoveryTokenExpires.toISOString()}, 
          updated_at = NOW()
        WHERE id = ${user.id}
      `;
      console.log('✅ Código guardado exitosamente');
    } catch (updateError) {
      console.error('❌ Error guardando código:', updateError);
      throw new Error(`Error actualizando usuario: ${updateError.message}`);
    }

    // Usar el email principal como destino (por ahora)
    const destinationEmail = user.email;
    console.log('📬 Email de destino:', destinationEmail);

    // Enviar email de recuperación
    try {
      console.log('📤 Enviando email de recuperación...');
      const emailResult = await sendRecoveryEmail({
        to: destinationEmail,
        userName: user.full_name || user.email,
        recoveryCode: recoveryCode,
        tenantName: user.tenant_name
      });

      console.log('✅ Email de recuperación enviado:', emailResult);
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
