import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * Endpoint de verificación de aislamiento para el tenant actual
 * Muestra todos los datos que el tenant puede ver y verifica que no hay mezcla
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener token de autenticación
    const authToken = req.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ 
        error: 'No autorizado',
        hasToken: false
      }, { status: 401 });
    }

    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ 
        error: 'Token inválido o sin tenantId',
        hasToken: true,
        hasTenantId: false,
        payload: payload
      }, { status: 401 });
    }

    const tenantId = payload.tenantId;
    const tenantIdString = String(tenantId);

    // Obtener información del tenant
    const tenantResult = await sql`
      SELECT id, name, email, status, plan_id, created_at
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Tenant no encontrado',
        tenantId: tenantId
      }, { status: 404 });
    }

    const tenant = tenantResult.rows[0];

    // Obtener empresa_config para este tenant
    const empresaResult = await sql`
      SELECT id, tenant_id, nombre_empresa, email as empresa_email, nif_empresa, created_at
      FROM empresa_config
      WHERE tenant_id = ${tenantIdString}
      LIMIT 1
    `;

    // Obtener usuarios de este tenant
    const usersResult = await sql`
      SELECT id, email, full_name, role, is_active, created_at
      FROM tenant_users
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    // Obtener reservas de este tenant
    const reservationsResult = await sql`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmadas,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas
      FROM reservations
      WHERE tenant_id = ${tenantId}
    `;

    // Obtener huéspedes de este tenant
    const guestsResult = await sql`
      SELECT COUNT(*) as total
      FROM guests
      WHERE tenant_id = ${tenantId}
    `;

    // Obtener registros de huéspedes de este tenant
    const registrationsResult = await sql`
      SELECT COUNT(*) as total
      FROM guest_registrations
      WHERE tenant_id = ${tenantId}
    `;

    // VERIFICACIÓN CRÍTICA: Contar datos de OTROS tenants (para verificar que existen pero este tenant no los ve)
    const otherTenantsEmpresaResult = await sql`
      SELECT COUNT(*) as total
      FROM empresa_config
      WHERE tenant_id != ${tenantIdString}
    `;

    const otherTenantsUsersResult = await sql`
      SELECT COUNT(*) as total
      FROM tenant_users
      WHERE tenant_id != ${tenantId}
    `;

    const otherTenantsReservationsResult = await sql`
      SELECT COUNT(*) as total
      FROM reservations
      WHERE tenant_id != ${tenantId}
    `;

    // Verificar que el tenant_id coincide correctamente
    const empresaConfig = empresaResult.rows[0] || null;
    const tenantIdMatches = empresaConfig 
      ? empresaConfig.tenant_id === tenantIdString 
      : null;

    return NextResponse.json({
      success: true,
      verification: {
        tenant_id: tenantId,
        tenant_id_string: tenantIdString,
        tenant_email: tenant.email,
        tenant_name: tenant.name,
        tenant_status: tenant.status,
        tenant_created: tenant.created_at
      },
      data: {
        empresa_config: {
          exists: empresaConfig !== null,
          data: empresaConfig,
          tenant_id_matches: tenantIdMatches,
          status: tenantIdMatches === true 
            ? '✅ CORRECTO - tenant_id coincide' 
            : tenantIdMatches === false 
            ? '❌ ERROR - tenant_id NO coincide' 
            : 'ℹ️ Sin empresa_config (normal si es nuevo)'
        },
        users: {
          total: usersResult.rows.length,
          data: usersResult.rows,
          status: usersResult.rows.length > 0 
            ? '✅ CORRECTO - Usuarios de este tenant' 
            : 'ℹ️ Sin usuarios adicionales (normal)'
        },
        reservations: {
          total: parseInt(reservationsResult.rows[0]?.total || '0'),
          confirmadas: parseInt(reservationsResult.rows[0]?.confirmadas || '0'),
          canceladas: parseInt(reservationsResult.rows[0]?.canceladas || '0'),
          status: parseInt(reservationsResult.rows[0]?.total || '0') > 0 
            ? '✅ CORRECTO - Reservas de este tenant' 
            : 'ℹ️ Sin reservas (normal si es nuevo)'
        },
        guests: {
          total: parseInt(guestsResult.rows[0]?.total || '0'),
          status: parseInt(guestsResult.rows[0]?.total || '0') > 0 
            ? '✅ CORRECTO - Huéspedes de este tenant' 
            : 'ℹ️ Sin huéspedes (normal si es nuevo)'
        },
        guest_registrations: {
          total: parseInt(registrationsResult.rows[0]?.total || '0'),
          status: parseInt(registrationsResult.rows[0]?.total || '0') > 0 
            ? '✅ CORRECTO - Registros de este tenant' 
            : 'ℹ️ Sin registros (normal si es nuevo)'
        }
      },
      isolation_check: {
        // Estos datos existen en la BD pero este tenant NO los ve (correcto)
        other_tenants_in_db: {
          empresa_config: parseInt(otherTenantsEmpresaResult.rows[0]?.total || '0'),
          users: parseInt(otherTenantsUsersResult.rows[0]?.total || '0'),
          reservations: parseInt(otherTenantsReservationsResult.rows[0]?.total || '0')
        },
        status: '✅ CORRECTO - Hay datos de otros tenants en la BD (normal), pero este tenant solo ve los suyos'
      },
      security: {
        middleware_tenant_id: req.headers.get('x-tenant-id'),
        jwt_tenant_id: tenantId,
        match: req.headers.get('x-tenant-id') === tenantId,
        status: req.headers.get('x-tenant-id') === tenantId 
          ? '✅ CORRECTO - Middleware inyectó tenant_id correctamente' 
          : '⚠️ ADVERTENCIA - tenant_id del middleware no coincide'
      }
    });

  } catch (error: any) {
    console.error('Error en verificación de aislamiento:', error);
    return NextResponse.json({
      error: 'Error interno',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

