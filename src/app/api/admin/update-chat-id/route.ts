import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST: Actualizar chat_id de un tenant
export async function POST(request: NextRequest) {
  try {
    // Para desarrollo, permitir sin autenticación
    // En producción, deberías añadir autenticación aquí

    const { tenantId, newChatId } = await request.json();
    
    if (!tenantId || !newChatId) {
      return NextResponse.json(
        { error: 'tenantId y newChatId son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que el tenant existe
    const tenantResult = await sql`
      SELECT id, name, email, telegram_chat_id
      FROM tenants
      WHERE id = ${tenantId}
    `;
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }
    
    const tenant = tenantResult.rows[0];
    
    // Actualizar el chat_id
    const updateResult = await sql`
      UPDATE tenants
      SET telegram_chat_id = ${newChatId}
      WHERE id = ${tenantId}
      RETURNING id, name, email, telegram_chat_id, telegram_enabled
    `;
    
    return NextResponse.json({
      success: true,
      message: `Chat ID actualizado para ${tenant.name}`,
      tenant: updateResult.rows[0],
      previous_chat_id: tenant.telegram_chat_id
    });
    
  } catch (error) {
    console.error('❌ Error actualizando chat ID:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
