import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { getRoomsForTenant } from '@/lib/tenant-rooms'
import type { Tenant } from '@/lib/tenant'
import { getTenantPlanPresentation } from '@/lib/tenant-plan-billing'

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que sea superadmin
    const payload = verifyToken(authToken)
    
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    // Obtener todos los tenants
    const tenantsResult = await sql`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.plan_id,
        t.plan_type,
        t.status,
        t.max_rooms,
        t.current_rooms,
        t.max_rooms_included,
        t.country_code,
        t.config,
        t.created_at
      FROM tenants t
      ORDER BY t.created_at DESC
    `

    const tenantsWithEffectiveLimits = await Promise.all(
      tenantsResult.rows.map(async (row) => {
        const tenant = row as Tenant
        const currentRooms = (await getRoomsForTenant(tenant.id)).length
        const presentation = await getTenantPlanPresentation(
          {
            ...tenant,
            current_rooms: currentRooms,
          } as Tenant,
          currentRooms
        )

        return {
          ...row,
          current_rooms: currentRooms,
          max_rooms: presentation.max_rooms_effective,
        }
      })
    )

    return NextResponse.json({
      tenants: tenantsWithEffectiveLimits
    })

  } catch (error) {
    console.error('❌ Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

