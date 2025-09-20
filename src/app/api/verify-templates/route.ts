import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando estado de las plantillas en la base de datos...');

    // Verificar si existe la tabla message_templates
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'message_templates'
      );
    `;

    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        success: false,
        error: 'La tabla message_templates no existe en la base de datos'
      });
    }

    // Obtener todas las plantillas
    const templates = await sql`
      SELECT 
        id,
        name,
        trigger_type,
        channel,
        language,
        is_active,
        created_at,
        updated_at,
        CASE 
          WHEN LENGTH(template_content) > 100 
          THEN LEFT(template_content, 100) || '...'
          ELSE template_content
        END as content_preview,
        variables
      FROM message_templates 
      ORDER BY created_at ASC
    `;

    // Obtener estadísticas
    const stats = await sql`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_templates,
        COUNT(CASE WHEN trigger_type = 'reservation_confirmed' THEN 1 END) as reservation_confirmed,
        COUNT(CASE WHEN trigger_type = 'check_in_instructions' THEN 1 END) as check_in_instructions,
        COUNT(CASE WHEN trigger_type = 'check_out_instructions' THEN 1 END) as check_out_instructions
      FROM message_templates
    `;

    // Verificar plantillas específicas que deberían existir
    const requiredTemplates = ['reservation_confirmed', 'check_in_instructions', 'check_out_instructions'];
    const missingTemplates = [];

    for (const trigger of requiredTemplates) {
      const exists = await sql`
        SELECT id FROM message_templates 
        WHERE trigger_type = ${trigger} AND channel = 'whatsapp'
      `;
      
      if (exists.rows.length === 0) {
        missingTemplates.push(trigger);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tableExists: true,
        templates: templates.rows,
        statistics: stats.rows[0],
        missingTemplates,
        verification: {
          hasReservationConfirmed: !missingTemplates.includes('reservation_confirmed'),
          hasCheckInInstructions: !missingTemplates.includes('check_in_instructions'),
          hasCheckOutInstructions: !missingTemplates.includes('check_out_instructions'),
          allRequiredTemplatesPresent: missingTemplates.length === 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error verificando plantillas:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al verificar las plantillas en la base de datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
