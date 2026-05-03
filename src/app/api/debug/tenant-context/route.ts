import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sql } from '@/lib/db';

import { denyDebugApiInProduction } from '@/lib/security-deployment';

/**
 * Endpoint de diagnóstico para verificar el contexto del tenant
 * Ayuda a identificar problemas de aislamiento
 */
export async function GET(req: NextRequest) {
  const denied = denyDebugApiInProduction();
  if (denied) return denied;

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

    // Obtener información del tenant desde la base de datos
    const tenantResult = await sql`
      SELECT id, name, email, status, plan_id, created_at
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    // Obtener empresa_config para este tenant
    const empresaResult = await sql`
      SELECT id, tenant_id, nombre_empresa, email as empresa_email, created_at
      FROM empresa_config
      WHERE tenant_id = ${tenantIdString}
      LIMIT 1
    `;

    // Verificar si hay otros empresa_config (para detectar fuga)
    const allEmpresaResult = await sql`
      SELECT id, tenant_id, nombre_empresa, email as empresa_email
      FROM empresa_config
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Verificar tenant_users para este tenant
    const usersResult = await sql`
      SELECT id, email, full_name, role, is_active
      FROM tenant_users
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      jwt: {
        tenantId: tenantId,
        tenantIdString: tenantIdString,
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      },
      tenant: tenantResult.rows[0] || null,
      empresa_config: {
        current: empresaResult.rows[0] || null,
        matches: empresaResult.rows[0]?.tenant_id === tenantIdString,
        total_in_db: allEmpresaResult.rows.length,
        all_records: allEmpresaResult.rows.map((r: any) => ({
          id: r.id,
          tenant_id: r.tenant_id,
          nombre_empresa: r.nombre_empresa,
          empresa_email: r.empresa_email,
          is_current_tenant: r.tenant_id === tenantIdString
        }))
      },
      users: usersResult.rows,
      security: {
        middleware_tenant_id: req.headers.get('x-tenant-id'),
        jwt_tenant_id: tenantId,
        match: req.headers.get('x-tenant-id') === tenantId
      }
    });

  } catch (error: any) {
    console.error('Error en diagnóstico de tenant:', error);
    return NextResponse.json({
      error: 'Error interno',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

