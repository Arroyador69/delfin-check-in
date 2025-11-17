// =====================================================
// API ENDPOINT: GESTIÓN DE CALENDARIOS EXTERNOS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    
    console.log('📅 Obteniendo calendarios externos para tenant:', tenantId);
    
    const result = await sql`
      SELECT 
        ec.*,
        tp.property_name
      FROM external_calendars ec
      LEFT JOIN tenant_properties tp ON ec.property_id = tp.id
      WHERE ec.tenant_id = ${tenantId}
      ORDER BY ec.created_at DESC
    `;
    
    const calendars = result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      property_id: row.property_id,
      calendar_name: row.calendar_name,
      calendar_type: row.calendar_type,
      calendar_url: row.calendar_url,
      sync_frequency: row.sync_frequency,
      last_sync_at: row.last_sync_at,
      sync_status: row.sync_status,
      sync_error: row.sync_error,
      is_active: row.is_active,
      property_name: row.property_name
    }));
    
    console.log(`✅ Encontrados ${calendars.length} calendarios`);
    
    return NextResponse.json({
      success: true,
      calendars
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo calendarios externos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const body = await req.json();
    
    const {
      property_id,
      calendar_name,
      calendar_type,
      calendar_url,
      sync_frequency = 15,
      is_active = true
    } = body;

    if (!property_id || !calendar_name || !calendar_url) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos obligatorios: property_id, calendar_name, calendar_url'
      }, { status: 400 });
    }

    // Usar 'ical' como tipo por defecto si no se especifica
    const calendarType = calendar_type || 'ical';

    // Verificar que la propiedad pertenece al tenant
    const propertyCheck = await sql`
      SELECT id FROM tenant_properties 
      WHERE id = ${property_id} AND tenant_id = ${tenantId}
    `;

    if (propertyCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Propiedad no encontrada o no pertenece al tenant'
      }, { status: 404 });
    }

    // Verificar límites del plan
    const settingsResult = await sql`
      SELECT max_properties, allowed_calendar_types
      FROM tenant_integration_settings
      WHERE tenant_id = ${tenantId}
    `;

    if (settingsResult.rows.length > 0) {
      const settings = settingsResult.rows[0];
      
      // Verificar tipo de calendario permitido (siempre permitir 'ical')
      if (!settings.allowed_calendar_types.includes(calendarType) && calendarType !== 'ical') {
        return NextResponse.json({
          success: false,
          error: `⚠️ Tipo de calendario no permitido: El tipo '${calendarType}' no está disponible en tu plan actual.`,
          details: `Tu plan solo permite los siguientes tipos de calendario: ${settings.allowed_calendar_types.join(', ')}. El tipo 'ical' está siempre disponible.`,
          suggestion: 'Usa un tipo de calendario permitido o actualiza tu plan para obtener acceso a más tipos de calendario.',
          requested_type: calendarType,
          allowed_types: settings.allowed_calendar_types
        }, { status: 403 });
      }

      // Verificar límite de calendarios por propiedad (máximo 5 calendarios externos adicionales)
      const calendarCount = await sql`
        SELECT COUNT(*) as count FROM external_calendars
        WHERE property_id = ${property_id} AND tenant_id = ${tenantId}
      `;

      const currentCalendarCount = parseInt(calendarCount.rows[0].count);
      if (currentCalendarCount >= 5) { // Máximo 5 calendarios externos por propiedad
        return NextResponse.json({
          success: false,
          error: '⚠️ Límite alcanzado: Has alcanzado el máximo de 5 calendarios externos por propiedad.',
          details: `Esta propiedad ya tiene ${currentCalendarCount} calendarios externos configurados. Cada propiedad puede tener un máximo de 5 calendarios externos adicionales.`,
          suggestion: 'Si necesitas más calendarios, puedes eliminar uno existente o considerar actualizar tu plan para obtener más capacidad.',
          current_count: currentCalendarCount,
          max_allowed: 5
        }, { status: 403 });
      }
    }

    const result = await sql`
      INSERT INTO external_calendars (
        tenant_id, property_id, calendar_name, calendar_type,
        calendar_url, sync_frequency, is_active
      ) VALUES (
        ${tenantId}, ${property_id}, ${calendar_name}, ${calendarType},
        ${calendar_url}, ${sync_frequency}, ${is_active}
      )
      RETURNING *
    `;

    console.log('✅ Calendario externo creado:', result.rows[0].id);
    
    return NextResponse.json({
      success: true,
      calendar: result.rows[0]
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creando calendario externo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de calendario es obligatorio para actualizar'
      }, { status: 400 });
    }

    const updateFields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const updateValues = Object.values(updates);

    if (updateValues.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay campos para actualizar'
      }, { status: 400 });
    }

    const result = await sql`
      UPDATE external_calendars
      SET ${sql.unsafe(updateFields)}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Calendario no encontrado o no pertenece al tenant'
      }, { status: 404 });
    }

    console.log('✅ Calendario externo actualizado:', id);
    
    return NextResponse.json({
      success: true,
      calendar: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error actualizando calendario externo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de calendario es obligatorio para eliminar'
      }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM external_calendars 
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Calendario no encontrado o no pertenece al tenant'
      }, { status: 404 });
    }

    console.log('✅ Calendario externo eliminado:', id);
    
    return NextResponse.json({
      success: true,
      message: 'Calendario eliminado correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error eliminando calendario externo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

