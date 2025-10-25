import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST: Crear acceso compartido a un tenant
export async function POST(request: NextRequest) {
  try {
    const { sourceTenantId, targetChatId, targetUserName, permissions = ['read_reservations'] } = await request.json();
    
    if (!sourceTenantId || !targetChatId) {
      return NextResponse.json(
        { error: 'sourceTenantId y targetChatId son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que el tenant fuente existe
    const sourceTenant = await sql`
      SELECT id, name, email FROM tenants WHERE id = ${sourceTenantId}
    `;
    
    if (sourceTenant.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant fuente no encontrado' },
        { status: 404 }
      );
    }

    // Crear o actualizar acceso compartido
    const result = await sql`
      INSERT INTO shared_tenant_access (
        source_tenant_id, target_chat_id, target_user_name, permissions, is_active
      ) VALUES (
        ${sourceTenantId}, ${targetChatId}, ${targetUserName || 'Usuario Compartido'}, 
        ${JSON.stringify(permissions)}, true
      )
      ON CONFLICT (source_tenant_id, target_chat_id) 
      DO UPDATE SET 
        permissions = ${JSON.stringify(permissions)},
        is_active = true,
        updated_at = NOW()
      RETURNING *
    `;
    
    return NextResponse.json({
      success: true,
      message: `Acceso compartido creado para ${targetUserName || targetChatId}`,
      shared_access: result.rows[0],
      source_tenant: sourceTenant.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error creando acceso compartido:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// GET: Listar accesos compartidos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    let result;
    if (tenantId) {
      result = await sql`
        SELECT 
          sta.*,
          t.name as source_tenant_name,
          t.email as source_tenant_email
        FROM shared_tenant_access sta
        JOIN tenants t ON sta.source_tenant_id = t.id
        WHERE sta.source_tenant_id = ${tenantId} AND sta.is_active = true
        ORDER BY sta.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT 
          sta.*,
          t.name as source_tenant_name,
          t.email as source_tenant_email
        FROM shared_tenant_access sta
        JOIN tenants t ON sta.source_tenant_id = t.id
        WHERE sta.is_active = true
        ORDER BY sta.created_at DESC
      `;
    }
    
    return NextResponse.json({
      success: true,
      shared_accesses: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo accesos compartidos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

