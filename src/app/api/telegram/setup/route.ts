import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// POST: Activar Telegram para un tenant
export async function POST(request: NextRequest) {
  try {
    const { tenantId, chatId, tokenLimit } = await request.json();
    
    if (!tenantId || !chatId) {
      return NextResponse.json(
        { error: 'tenantId y chatId son obligatorios' },
        { status: 400 }
      );
    }
    
    // Actualizar tenant
    const result = await sql`
      UPDATE tenants 
      SET 
        telegram_chat_id = ${chatId},
        telegram_enabled = true,
        ai_token_limit = ${tokenLimit || 100000},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${tenantId}
      RETURNING *
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tenant: result.rows[0],
      message: 'Telegram activado correctamente',
    });
    
  } catch (error) {
    console.error('Error en setup:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// GET: Obtener configuración de Telegram para un tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const chatId = searchParams.get('chatId');
    
    let result;
    
    if (tenantId) {
      result = await sql`
        SELECT 
          id,
          name,
          email,
          telegram_chat_id,
          telegram_enabled,
          ai_tokens_used,
          ai_token_limit,
          ROUND((ai_tokens_used::DECIMAL / NULLIF(ai_token_limit, 0)) * 100, 2) as usage_percentage
        FROM tenants
        WHERE id = ${tenantId}
      `;
    } else if (chatId) {
      result = await sql`
        SELECT 
          id,
          name,
          email,
          telegram_chat_id,
          telegram_enabled,
          ai_tokens_used,
          ai_token_limit,
          ROUND((ai_tokens_used::DECIMAL / NULLIF(ai_token_limit, 0)) * 100, 2) as usage_percentage
        FROM tenants
        WHERE telegram_chat_id = ${chatId}
      `;
    } else {
      // Listar todos los tenants con Telegram activado
      result = await sql`
        SELECT 
          id,
          name,
          email,
          telegram_chat_id,
          telegram_enabled,
          ai_tokens_used,
          ai_token_limit,
          ROUND((ai_tokens_used::DECIMAL / NULLIF(ai_token_limit, 0)) * 100, 2) as usage_percentage
        FROM tenants
        WHERE telegram_enabled = true
        ORDER BY name
      `;
    }
    
    return NextResponse.json({
      success: true,
      tenants: result.rows,
      count: result.rows.length,
    });
    
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// DELETE: Desactivar Telegram para un tenant
export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId es obligatorio' },
        { status: 400 }
      );
    }
    
    const result = await sql`
      UPDATE tenants 
      SET 
        telegram_enabled = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${tenantId}
      RETURNING *
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tenant: result.rows[0],
      message: 'Telegram desactivado correctamente',
    });
    
  } catch (error) {
    console.error('Error desactivando Telegram:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

