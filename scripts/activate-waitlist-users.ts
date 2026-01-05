/**
 * ========================================
 * SCRIPT: Activar Usuarios de Waitlist
 * ========================================
 * 
 * Este script activa usuarios de la waitlist creando cuentas FREE automáticamente
 * y enviando emails para que creen su contraseña.
 * 
 * Uso:
 *   npx tsx scripts/activate-waitlist-users.ts [--limit N] [--dry-run]
 * 
 * Opciones:
 *   --limit N: Activar solo los primeros N usuarios (por defecto: todos)
 *   --dry-run: Solo mostrar qué se haría sin ejecutar cambios
 */

import { sql } from '@vercel/postgres';
import { createTenant, createTenantUser } from '@/lib/tenant';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
}

interface ActivationResult {
  email: string;
  success: boolean;
  tenantId?: string;
  error?: string;
}

/**
 * Genera un token seguro para reset de contraseña
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Envía email de activación usando el servicio de email del sistema
 */
async function sendActivationEmail(
  email: string,
  name: string | null,
  resetToken: string
): Promise<void> {
  try {
    const { sendEmail } = await import('../src/lib/email');
    
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/reset-password?token=${resetToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Tu cuenta de Delfín Check-in está lista!</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #44c0ff 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #1d4ed8; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; }
          .info-box { background: #f8f9fa; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐬 ¡Bienvenido a Delfín Check-in!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Tu cuenta está lista</p>
          </div>
          <div class="content">
            <h2>¡Gracias por unirte a la lista de espera!</h2>
            <p>Hola ${name || 'propietario'},</p>
            <p>Tu cuenta de <strong>Delfín Check-in</strong> ha sido activada con el plan <strong>FREE</strong>. Ya puedes empezar a gestionar tus alojamientos.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Crear mi contraseña</a>
            </p>
            <div class="info-box">
              <p style="margin: 0 0 10px 0;"><strong>🔑 Importante:</strong></p>
              <p style="margin: 0;">Este enlace expirará en <strong>7 días</strong>. Si no lo usas, puedes solicitar uno nuevo desde la página de login.</p>
            </div>
            <p>Si tienes problemas para acceder, puedes usar este enlace directo:</p>
            <p style="word-break: break-all; color: #2563eb; font-size: 12px;">${resetUrl}</p>
            <p style="margin-top: 30px;">¡Esperamos que disfrutes usando Delfín Check-in!</p>
            <p>El equipo de Delfín Check-in</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">Este es un email automático, por favor no respondas a este mensaje.</p>
            <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Delfín Check-in. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
¡Bienvenido a Delfín Check-in!

Hola ${name || 'propietario'},

Tu cuenta de Delfín Check-in ha sido activada con el plan FREE. Ya puedes empezar a gestionar tus alojamientos.

Crea tu contraseña aquí: ${resetUrl}

Este enlace expirará en 7 días.

¡Esperamos que disfrutes usando Delfín Check-in!

El equipo de Delfín Check-in
    `;

    const result = await sendEmail({
      to: email,
      subject: '¡Tu cuenta de Delfín Check-in está lista! 🐬',
      html: emailHtml,
      text: emailText
    });

    if (result.success) {
      console.log(`✅ Email de activación enviado a ${email}`);
    } else {
      console.error(`❌ Error enviando email a ${email}:`, result.error);
      throw new Error(result.error || 'Error enviando email');
    }
  } catch (error: any) {
    console.error(`❌ Error en sendActivationEmail para ${email}:`, error);
    // No lanzar error para no detener el proceso de activación
    // El usuario puede solicitar un nuevo token desde el login
    console.warn(`⚠️ No se pudo enviar email a ${email}, pero la cuenta fue activada. El usuario puede solicitar un nuevo token desde el login.`);
  }
}

/**
 * Activa un usuario de la waitlist
 */
async function activateUser(
  entry: WaitlistEntry,
  dryRun: boolean = false
): Promise<ActivationResult> {
  try {
    // Verificar si ya tiene tenant
    const existingTenant = await sql`
      SELECT id FROM tenants WHERE email = ${entry.email} LIMIT 1
    `;
    
    if (existingTenant.rows.length > 0) {
      console.log(`⚠️  ${entry.email} ya tiene un tenant: ${existingTenant.rows[0].id}`);
      
      // Marcar como activado en waitlist si no está marcado
      if (!dryRun) {
        await sql`
          UPDATE waitlist 
          SET activated_at = NOW(), tenant_id = ${existingTenant.rows[0].id}
          WHERE email = ${entry.email} AND activated_at IS NULL
        `;
      }
      
      return {
        email: entry.email,
        success: true,
        tenantId: existingTenant.rows[0].id
      };
    }
    
    if (dryRun) {
      console.log(`[DRY RUN] Crearía tenant para ${entry.email}`);
      return {
        email: entry.email,
        success: true
      };
    }
    
    // Crear tenant con plan FREE
    const tenant = await createTenant({
      name: entry.name || entry.email.split('@')[0],
      email: entry.email,
      plan_id: 'free', // Mantener compatibilidad
      config: {}
    });
    
    // Actualizar tenant con flags del nuevo sistema
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
      WHERE id = ${tenant.id}
    `;
    
    // Generar token de reset de contraseña
    const resetToken = generateResetToken();
    const resetTokenExpires = new Date();
    resetTokenExpires.setDate(resetTokenExpires.getDate() + 7); // Expira en 7 días
    
    // Crear usuario con token de reset (sin contraseña aún)
    // Usaremos una contraseña temporal que el usuario debe cambiar
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hash(tempPassword, 10);
    
    await createTenantUser({
      tenant_id: tenant.id,
      email: entry.email,
      password_hash: passwordHash,
      full_name: entry.name || undefined,
      role: 'owner'
    });
    
    // Actualizar usuario con token de reset
    await sql`
      UPDATE tenant_users
      SET 
        reset_token = ${resetToken},
        reset_token_expires = ${resetTokenExpires.toISOString()},
        email_verified = false
      WHERE tenant_id = ${tenant.id} AND email = ${entry.email}
    `;
    
    // Marcar como activado en waitlist
    await sql`
      UPDATE waitlist
      SET 
        activated_at = NOW(),
        tenant_id = ${tenant.id}
      WHERE id = ${entry.id}
    `;
    
    // Enviar email de activación
    await sendActivationEmail(entry.email, entry.name, resetToken);
    
    console.log(`✅ Activado: ${entry.email} -> Tenant ${tenant.id}`);
    
    return {
      email: entry.email,
      success: true,
      tenantId: tenant.id
    };
    
  } catch (error: any) {
    console.error(`❌ Error activando ${entry.email}:`, error.message);
    return {
      email: entry.email,
      success: false,
      error: error.message
    };
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const dryRun = args.includes('--dry-run');
  
  console.log('🚀 Iniciando activación de usuarios de waitlist...');
  console.log(`   Modo: ${dryRun ? 'DRY RUN (sin cambios)' : 'PRODUCCIÓN'}`);
  if (limit) {
    console.log(`   Límite: ${limit} usuarios`);
  }
  console.log('');
  
  try {
    // Obtener usuarios pendientes de la waitlist
    let query = sql`
      SELECT id, email, name, created_at
      FROM waitlist
      WHERE activated_at IS NULL
      ORDER BY created_at ASC
    `;
    
    if (limit) {
      query = sql`
        SELECT id, email, name, created_at
        FROM waitlist
        WHERE activated_at IS NULL
        ORDER BY created_at ASC
        LIMIT ${limit}
      `;
    }
    
    const result = await query;
    const entries: WaitlistEntry[] = result.rows as WaitlistEntry[];
    
    if (entries.length === 0) {
      console.log('✅ No hay usuarios pendientes en la waitlist');
      return;
    }
    
    console.log(`📋 Encontrados ${entries.length} usuarios pendientes\n`);
    
    const results: ActivationResult[] = [];
    
    for (const entry of entries) {
      const result = await activateUser(entry, dryRun);
      results.push(result);
      
      // Pequeña pausa para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Resumen
    console.log('\n📊 RESUMEN:');
    console.log(`   Total procesados: ${results.length}`);
    console.log(`   Exitosos: ${results.filter(r => r.success).length}`);
    console.log(`   Errores: ${results.filter(r => !r.success).length}`);
    
    if (results.some(r => !r.success)) {
      console.log('\n❌ Errores:');
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.email}: ${r.error}`));
    }
    
  } catch (error: any) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

export { activateUser, main };

