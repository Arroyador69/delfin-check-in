// =====================================================
// API: OBTENER Y GESTIONAR ENLACE DE PAGO ESPECÍFICO
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

// GET: Obtener información de un enlace de pago (público)
export async function GET(
  req: NextRequest,
  { params }: { params: { linkCode: string } }
) {
  try {
    const { linkCode } = params;

    const linkResult = await sql`
      SELECT 
        pl.*,
        CASE 
          WHEN pl.resource_type = 'room' THEN r.name
          WHEN pl.resource_type = 'property' THEN tp.property_name
        END AS resource_name
      FROM payment_links pl
      LEFT JOIN "Room" r ON pl.resource_type = 'room' AND r.id::text = pl.resource_id
      LEFT JOIN tenant_properties tp ON pl.resource_type = 'property' AND tp.id::text = pl.resource_id
      WHERE pl.link_code = ${linkCode}
    `;

    if (linkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    const link = linkResult.rows[0];

    // Verificar si el enlace está activo
    if (!link.is_active) {
      return NextResponse.json(
        { success: false, error: 'Este enlace de pago está desactivado' },
        { status: 403 }
      );
    }

    // Verificar fecha de expiración
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este enlace de pago ha expirado' },
        { status: 403 }
      );
    }

    // Verificar límite de usos
    if (link.max_uses && link.usage_count >= link.max_uses) {
      return NextResponse.json(
        { success: false, error: 'Este enlace de pago ha alcanzado su límite de usos' },
        { status: 403 }
      );
    }

    // Calcular número de noches
    const checkIn = new Date(link.check_in_date);
    const checkOut = new Date(link.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      success: true,
      link: {
        ...link,
        nights
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo enlace de pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar o desactivar enlace de pago
export async function DELETE(
  req: NextRequest,
  { params }: { params: { linkCode: string } }
) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant no identificado' },
        { status: 401 }
      );
    }

    const { linkCode } = params;

    // Verificar que el enlace pertenece al tenant
    const linkResult = await sql`
      SELECT id FROM payment_links
      WHERE link_code = ${linkCode} AND tenant_id = ${tenantId}::uuid
    `;

    if (linkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    // Desactivar el enlace (soft delete)
    await sql`
      UPDATE payment_links
      SET is_active = false, updated_at = NOW()
      WHERE link_code = ${linkCode} AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({
      success: true,
      message: 'Enlace desactivado correctamente'
    });
  } catch (error: any) {
    console.error('Error eliminando enlace de pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

