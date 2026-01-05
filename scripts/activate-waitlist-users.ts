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
 * Envía email de activación (placeholder - implementar con tu servicio de email)
 */
async function sendActivationEmail(
  email: string,
  name: string | null,
  resetToken: string
): Promise<void> {
  // TODO: Implementar envío de email real
  // Ejemplo con Resend, SendGrid, etc.
  
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/reset-password?token=${resetToken}`;
  
  console.log(`📧 [EMAIL] Enviando email de activación a ${email}`);
  console.log(`   URL de reset: ${resetUrl}`);
  console.log(`   Token: ${resetToken}`);
  
  // Implementar aquí el envío real de email
  // await sendEmail({
  //   to: email,
  //   subject: '¡Tu cuenta de Delfín Check-in está lista!',
  //   html: `
  //     <h1>¡Bienvenido a Delfín Check-in!</h1>
  //     <p>Hola ${name || 'propietario'},</p>
  //     <p>Tu cuenta está lista. Haz clic en el siguiente enlace para crear tu contraseña:</p>
  //     <a href="${resetUrl}">Crear contraseña</a>
  //     <p>Este enlace expirará en 7 días.</p>
  //   `
  // });
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

