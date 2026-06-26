import { NextRequest, NextResponse } from 'next/server';
import { getTenantById, getTenantId } from '@/lib/tenant';
import type { Tenant } from '@/lib/tenant';
import { getTenantPlanPresentation, resolveMirCredentialsMaxAllowed } from '@/lib/tenant-plan-billing';
import { getRoomsForTenant } from '@/lib/tenant-rooms';

export async function GET(req: NextRequest) {
  try {
    // Priorizar tenant_id desde JWT; si no está, caer al header (compatibilidad)
    let tenantId = await getTenantId(req);
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id') || req.headers.get('X-Tenant-Id') || null;
    }

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

    const currentRooms = await getRoomsForTenant(tenantId);
    const roomsUsed = currentRooms.length;

    const presentation = await getTenantPlanPresentation(tenant as Tenant, roomsUsed);
    const mirCredentialsMax = resolveMirCredentialsMaxAllowed(presentation);

    const limits = {
      max_rooms: presentation.max_rooms_effective,
      mir_credentials_max: mirCredentialsMax,
      billing_rooms: presentation.billing_rooms,
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
          mirCredentialsMax: limits.mir_credentials_max,
          billingRooms: limits.billing_rooms,
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
