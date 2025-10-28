import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Activando plantillas de mensajes...');

    // Activar todas las plantillas principales
    const result = await sql`
      UPDATE message_templates 
      SET is_active = true, updated_at = NOW()
      WHERE trigger_type IN ('reservation_confirmed', 'check_in_instructions', 'check_out_instructions')
      AND channel = 'whatsapp'
    `;

    // Verificar qué plantillas se activaron
    const activatedTemplates = await sql`
      SELECT 
        id,
        name,
        trigger_type,
        is_active,
        updated_at
      FROM message_templates 
      WHERE trigger_type IN ('reservation_confirmed', 'check_in_instructions', 'check_out_instructions')
      AND channel = 'whatsapp'
      ORDER BY trigger_type
    `;

    console.log(`✅ Se activaron ${result.rowCount} plantillas`);

    return NextResponse.json({
      success: true,
      message: `Se activaron ${result.rowCount} plantillas correctamente`,
      data: {
        updatedCount: result.rowCount,
        templates: activatedTemplates.rows
      }
    });

  } catch (error) {
    console.error('❌ Error activando plantillas:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al activar las plantillas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener estado actual de las plantillas
    const templates = await sql`
      SELECT 
        id,
        name,
        trigger_type,
        is_active,
        created_at,
        updated_at
      FROM message_templates 
      WHERE channel = 'whatsapp'
      ORDER BY trigger_type
    `;

    return NextResponse.json({
      success: true,
      data: templates.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de plantillas:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener el estado de las plantillas'
    });
  }
}
