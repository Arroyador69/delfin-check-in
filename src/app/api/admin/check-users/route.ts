import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET: Verificar usuarios por tenant
export async function GET(request: NextRequest) {
  try {
    // Para desarrollo, permitir sin autenticación
    // En producción, deberías añadir autenticación aquí

    // Obtener todos los tenants con sus usuarios
    const result = await sql`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.email as tenant_email,
        t.telegram_chat_id,
        t.telegram_enabled,
        tu.id as user_id,
        tu.email as user_email,
        tu.role,
        tu.auth_token IS NOT NULL as has_token
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      ORDER BY t.name, tu.email
    `;
    
    // Agrupar por tenant
    const tenantsMap = new Map();
    
    for (const row of result.rows) {
      const tenantId = row.tenant_id;
      
      if (!tenantsMap.has(tenantId)) {
        tenantsMap.set(tenantId, {
          tenant_id: tenantId,
          tenant_name: row.tenant_name,
          tenant_email: row.tenant_email,
          telegram_chat_id: row.telegram_chat_id,
          telegram_enabled: row.telegram_enabled,
          users: []
        });
      }
      
      if (row.user_id) {
        tenantsMap.get(tenantId).users.push({
          user_id: row.user_id,
          user_email: row.user_email,
          role: row.role,
          has_token: row.has_token
        });
      }
    }
    
    const tenants = Array.from(tenantsMap.values());
    
    return NextResponse.json({
      success: true,
      tenants,
      summary: {
        total_tenants: tenants.length,
        tenants_with_users: tenants.filter(t => t.users.length > 0).length,
        tenants_without_users: tenants.filter(t => t.users.length === 0).length,
        total_users: tenants.reduce((sum, t) => sum + t.users.length, 0),
        users_with_tokens: tenants.reduce((sum, t) => sum + t.users.filter(u => u.has_token).length, 0),
        users_without_tokens: tenants.reduce((sum, t) => sum + t.users.filter(u => !u.has_token).length, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error verificando usuarios:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
