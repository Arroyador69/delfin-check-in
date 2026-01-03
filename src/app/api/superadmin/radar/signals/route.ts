import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

// =====================================================
// GET: Obtener todas las señales del Radar
// =====================================================
export async function GET(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('property_id');
    const tenantId = searchParams.get('tenant_id');
    const activeOnly = searchParams.get('active_only') === 'true';
    const processed = searchParams.get('processed');

    let query = sql`
      SELECT 
        rs.*,
        tp.property_name,
        t.name as tenant_name,
        t.email as tenant_email
      FROM radar_signals rs
      JOIN tenant_properties tp ON rs.property_id = tp.id
      JOIN tenants t ON rs.tenant_id = t.id
      WHERE 1=1
    `;

    if (propertyId) {
      query = sql`${query} AND rs.property_id = ${parseInt(propertyId)}`;
    }

    if (tenantId) {
      query = sql`${query} AND rs.tenant_id = ${tenantId}::uuid`;
    }

    if (activeOnly) {
      query = sql`${query} AND rs.is_active = true AND (rs.expires_at IS NULL OR rs.expires_at > NOW())`;
    }

    if (processed === 'true') {
      query = sql`${query} AND rs.processed = true`;
    } else if (processed === 'false') {
      query = sql`${query} AND rs.processed = false`;
    }

    query = sql`${query} ORDER BY rs.detected_at DESC, rs.signal_intensity DESC LIMIT 100`;

    const result = await query;

    return NextResponse.json({
      success: true,
      signals: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo señales del Radar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: Crear nueva señal del Radar
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const {
      property_id,
      tenant_id,
      signal_type,
      signal_intensity,
      signal_data,
      expires_at
    } = body;

    // Validaciones
    if (!property_id || !tenant_id || !signal_type) {
      return NextResponse.json(
        { success: false, error: 'property_id, tenant_id y signal_type son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la propiedad existe
    const propertyCheck = await sql`
      SELECT id, tenant_id FROM tenant_properties 
      WHERE id = ${property_id} AND tenant_id = ${tenant_id}::uuid
    `;

    if (propertyCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Propiedad no encontrada o no pertenece al tenant' },
        { status: 404 }
      );
    }

    // Crear la señal
    const result = await sql`
      INSERT INTO radar_signals (
        property_id,
        tenant_id,
        signal_type,
        signal_intensity,
        signal_data,
        expires_at,
        is_active,
        processed
      ) VALUES (
        ${property_id},
        ${tenant_id}::uuid,
        ${signal_type},
        ${signal_intensity || 0},
        ${JSON.stringify(signal_data || {})},
        ${expires_at ? new Date(expires_at) : null},
        true,
        false
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      signal: result.rows[0],
      message: 'Señal del Radar creada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error creando señal del Radar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT: Actualizar señal del Radar
// =====================================================
export async function PUT(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const {
      id,
      signal_intensity,
      signal_data,
      is_active,
      processed,
      expires_at
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id es requerido' },
        { status: 400 }
      );
    }

    // Actualizar la señal
    const result = await sql`
      UPDATE radar_signals
      SET 
        signal_intensity = COALESCE(${signal_intensity}, signal_intensity),
        signal_data = COALESCE(${signal_data ? JSON.stringify(signal_data) : null}::jsonb, signal_data),
        is_active = COALESCE(${is_active}, is_active),
        processed = COALESCE(${processed}, processed),
        expires_at = COALESCE(${expires_at ? new Date(expires_at) : null}, expires_at),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Señal no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      signal: result.rows[0],
      message: 'Señal actualizada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando señal del Radar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE: Eliminar señal del Radar
// =====================================================
export async function DELETE(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id es requerido' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM radar_signals
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Señal no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Señal eliminada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error eliminando señal del Radar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

