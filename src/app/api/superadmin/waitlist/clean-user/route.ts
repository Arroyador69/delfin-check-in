import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * POST /api/superadmin/waitlist/clean-user
 * Limpia completamente un usuario de todas las tablas relacionadas
 * Útil para testing: permite eliminar un usuario y volver a registrarlo
 * 
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Obtener tenant_id si existe
    const tenantResult = await sql`
      SELECT id FROM tenants WHERE email = ${email} LIMIT 1
    `;
    
    const tenantId = tenantResult.rows.length > 0 ? tenantResult.rows[0].id : null;

    const results = {
      deleted_from_waitlist: false,
      deleted_from_tenants: false,
      deleted_from_tenant_users: false,
      deleted_from_referrals: false,
      deleted_from_affiliate_customers: false,
      deleted_from_referrals_as_referrer: false,
      tenant_id_deleted: null as string | null,
    };

    // 1. Eliminar de affiliate_customers (si existe tenant_id)
    if (tenantId) {
      const affiliateResult = await sql`
        DELETE FROM affiliate_customers WHERE tenant_id = ${tenantId}::uuid
      `;
      if (affiliateResult.rowCount && affiliateResult.rowCount > 0) {
        results.deleted_from_affiliate_customers = true;
      }
    }

    // 2. Eliminar de referrals (como referido y como referente)
    // Nota: Las tablas relacionadas (referral_events, referral_rewards, referral_plan_history)
    // se eliminan automáticamente con ON DELETE CASCADE
    if (tenantId) {
      // Como referido
      const referralsAsReferred = await sql`
        DELETE FROM referrals WHERE referred_tenant_id = ${tenantId}::uuid
      `;
      if (referralsAsReferred.rowCount && referralsAsReferred.rowCount > 0) {
        results.deleted_from_referrals = true;
      }
      
      // Como referente
      const referralsAsReferrer = await sql`
        DELETE FROM referrals WHERE referrer_tenant_id = ${tenantId}::uuid
      `;
      if (referralsAsReferrer.rowCount && referralsAsReferrer.rowCount > 0) {
        results.deleted_from_referrals_as_referrer = true;
      }
      
      // Limpiar campos relacionados en tenants (referred_by)
      await sql`
        UPDATE tenants SET referred_by = NULL WHERE referred_by = ${tenantId}::uuid
      `;
      
      // Limpiar referral_code del tenant (si existe)
      await sql`
        UPDATE tenants SET referral_code = NULL WHERE id = ${tenantId}::uuid
      `;
    }

    // 3. Eliminar tenant_users (se elimina automáticamente con CASCADE, pero lo hacemos explícito)
    if (tenantId) {
      const tenantUsersResult = await sql`
        DELETE FROM tenant_users WHERE tenant_id = ${tenantId}::uuid
      `;
      if (tenantUsersResult.rowCount && tenantUsersResult.rowCount > 0) {
        results.deleted_from_tenant_users = true;
      }
    }

    // 4. Eliminar de tenants
    if (tenantId) {
      const tenantsResult = await sql`
        DELETE FROM tenants WHERE id = ${tenantId}::uuid
      `;
      if (tenantsResult.rowCount && tenantsResult.rowCount > 0) {
        results.deleted_from_tenants = true;
        results.tenant_id_deleted = tenantId;
      }
    }

    // 5. Eliminar de waitlist
    const waitlistResult = await sql`
      DELETE FROM waitlist WHERE email = ${email}
    `;
    if (waitlistResult.rowCount && waitlistResult.rowCount > 0) {
      results.deleted_from_waitlist = true;
    }

    // Verificar si se eliminó algo
    const somethingDeleted = 
      results.deleted_from_waitlist ||
      results.deleted_from_tenants ||
      results.deleted_from_tenant_users ||
      results.deleted_from_referrals ||
      results.deleted_from_affiliate_customers;

    if (!somethingDeleted) {
      return NextResponse.json({
        success: true,
        message: 'No se encontró ningún registro para este email',
        results
      });
    }

    return NextResponse.json({
      success: true,
      message: `Usuario ${email} eliminado completamente de la base de datos`,
      results
    });

  } catch (error: any) {
    console.error('Error limpiando usuario:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al limpiar usuario',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
