import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

// =====================================================
// GET: Obtener todas las landings dinámicas
// =====================================================
export async function GET(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('property_id');
    const tenantId = searchParams.get('tenant_id');
    const status = searchParams.get('status');
    const publishedOnly = searchParams.get('published_only') === 'true';

    let text = `
      SELECT 
        dl.*,
        tp.property_name,
        t.name as tenant_name,
        t.email as tenant_email,
        rs.signal_type,
        rs.signal_intensity,
        CASE 
          WHEN dl.views > 0 THEN ROUND((dl.conversions::DECIMAL / dl.views) * 100, 2)
          ELSE 0
        END as conversion_rate
      FROM dynamic_landings dl
      JOIN tenant_properties tp ON dl.property_id = tp.id
      JOIN tenants t ON dl.tenant_id = t.id
      LEFT JOIN radar_signals rs ON dl.radar_signal_id = rs.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId) {
      params.push(parseInt(propertyId));
      text += ` AND dl.property_id = $${params.length}`;
    }

    if (tenantId) {
      params.push(tenantId);
      text += ` AND dl.tenant_id = $${params.length}::uuid`;
    }

    if (status) {
      params.push(status);
      text += ` AND dl.status = $${params.length}`;
    }

    if (publishedOnly) {
      text += ` AND dl.is_published = true`;
    }

    text += ` ORDER BY dl.created_at DESC LIMIT 100`;

    const result = await (sql as any).query(text, params);

    return NextResponse.json({
      success: true,
      landings: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo landings dinámicas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: Crear nueva landing dinámica
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const {
      property_id,
      tenant_id,
      radar_signal_id,
      slug,
      content,
      target_date_start,
      target_date_end,
      target_keywords,
      target_audience,
      status
    } = body;

    // Validaciones
    if (!property_id || !tenant_id || !slug || !content) {
      return NextResponse.json(
        { success: false, error: 'property_id, tenant_id, slug y content son requeridos' },
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

    // Verificar que el slug es único
    const slugCheck = await sql`
      SELECT id FROM dynamic_landings WHERE slug = ${slug}
    `;

    if (slugCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'El slug ya está en uso' },
        { status: 400 }
      );
    }

    // Generar URL pública (se construirá dinámicamente en el frontend)
    const publicUrl = `https://book.delfincheckin.com/${tenant_id}/landing/${slug}`;

    // Crear la landing
    const result = await sql`
      INSERT INTO dynamic_landings (
        property_id,
        tenant_id,
        radar_signal_id,
        slug,
        public_url,
        content,
        target_date_start,
        target_date_end,
        target_keywords,
        target_audience,
        status,
        is_published,
        views,
        conversions
      ) VALUES (
        ${property_id},
        ${tenant_id}::uuid,
        ${radar_signal_id || null},
        ${slug},
        ${publicUrl},
        ${JSON.stringify(content)},
        ${target_date_start ? new Date(target_date_start).toISOString() : null},
        ${target_date_end ? new Date(target_date_end).toISOString() : null},
        ${target_keywords || []},
        ${target_audience || null},
        ${status || 'draft'},
        false,
        0,
        0
      )
      RETURNING *
    `;

    // Si hay radar_signal_id, marcar la señal como procesada
    if (radar_signal_id) {
      await sql`
        UPDATE radar_signals
        SET processed = true, updated_at = NOW()
        WHERE id = ${radar_signal_id}
      `;
    }

    return NextResponse.json({
      success: true,
      landing: result.rows[0],
      message: 'Landing dinámica creada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error creando landing dinámica:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT: Actualizar landing dinámica
// =====================================================
export async function PUT(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const {
      id,
      slug,
      content,
      target_date_start,
      target_date_end,
      target_keywords,
      target_audience,
      status,
      is_published
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id es requerido' },
        { status: 400 }
      );
    }

    // Si se actualiza el slug, verificar que sea único
    if (slug) {
      const slugCheck = await sql`
        SELECT id FROM dynamic_landings WHERE slug = ${slug} AND id != ${id}
      `;

      if (slugCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'El slug ya está en uso' },
          { status: 400 }
        );
      }
    }

    // Obtener tenant_id para reconstruir URL si cambió el slug
    const current = await sql`SELECT tenant_id, slug FROM dynamic_landings WHERE id = ${id}`;
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Landing no encontrada' },
        { status: 404 }
      );
    }

    const finalSlug = slug || current.rows[0].slug;
    const tenantId = current.rows[0].tenant_id;
    const publicUrl = `https://book.delfincheckin.com/${tenantId}/landing/${finalSlug}`;

    // Actualizar published_at si se publica por primera vez
    let publishedAtClause = sql`published_at`;
    if (is_published === true) {
      const currentPublished = await sql`SELECT is_published FROM dynamic_landings WHERE id = ${id}`;
      if (currentPublished.rows[0]?.is_published === false) {
        publishedAtClause = sql`NOW()`;
      }
    }

    // Actualizar la landing
    const result = await sql`
      UPDATE dynamic_landings
      SET 
        slug = COALESCE(${slug || null}, slug),
        public_url = ${publicUrl},
        content = COALESCE(${content ? JSON.stringify(content) : null}::jsonb, content),
        target_date_start = COALESCE(${target_date_start ? new Date(target_date_start).toISOString() : null}, target_date_start),
        target_date_end = COALESCE(${target_date_end ? new Date(target_date_end).toISOString() : null}, target_date_end),
        target_keywords = COALESCE(${target_keywords || null}, target_keywords),
        target_audience = COALESCE(${target_audience || null}, target_audience),
        status = COALESCE(${status || null}, status),
        is_published = COALESCE(${is_published}, is_published),
        published_at = CASE WHEN ${is_published === true} AND is_published = false THEN NOW() ELSE published_at END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Landing no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      landing: result.rows[0],
      message: 'Landing actualizada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando landing dinámica:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE: Eliminar landing dinámica
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
      DELETE FROM dynamic_landings
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Landing no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Landing eliminada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error eliminando landing dinámica:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

