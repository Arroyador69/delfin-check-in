import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantById } from '@/lib/tenant';
import type { Tenant } from '@/lib/tenant';
import { getTenantPlanPresentation } from '@/lib/tenant-plan-billing';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');

    if (!tenantId || tenantId === 'default') {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo identificar el tenant',
        },
        { status: 400 }
      );
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tenant no encontrado',
        },
        { status: 404 }
      );
    }

    const lodgingId =
      tenant.lodging_id && String(tenant.lodging_id).trim() !== ''
        ? String(tenant.lodging_id)
        : String(tenant.id);

    const roomsResult = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id ASC
    `;

    const currentRooms = roomsResult.rows.map((row) => ({
      id: parseInt(String(row.id), 10),
      name: row.name,
    }));

    const roomsUsed = currentRooms.length;

    const presentation = await getTenantPlanPresentation(tenant as Tenant, roomsUsed);

    const limits = {
      max_rooms: presentation.max_rooms_effective,
      max_reservations: 1000,
      max_guests: 500,
    };

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        plan_type: presentation.effective_plan_type,
        limits: {
          maxRooms: limits.max_rooms,
          maxReservations: limits.max_reservations,
          maxGuests: limits.max_guests,
        },
      },
      currentRooms,
      message: 'Límites del tenant obtenidos correctamente',
    });
  } catch (error) {
    console.error('Error obteniendo límites del tenant:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo límites del tenant',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
