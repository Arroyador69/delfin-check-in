import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { getRoomsForTenant } from '@/lib/tenant-rooms'
import type { Tenant } from '@/lib/tenant'
import { getTenantPlanPresentation } from '@/lib/tenant-plan-billing'

async function hasEmailTrackingTable(): Promise<boolean> {
  try {
    const meta = await sql`
      SELECT to_regclass('public.email_tracking') as reg
    `
    return Boolean(meta.rows[0]?.reg)
  } catch {
    return false
  }
}

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

    const emailTrackingEnabled = await hasEmailTrackingTable()

    // Obtener todos los tenants (+ último email de onboarding si hay tracking)
    const tenantsResult = emailTrackingEnabled
      ? await sql`
          SELECT
            t.id,
            t.name,
            t.email,
            t.plan_id,
            t.plan_type,
            t.status,
            t.onboarding_status,
            t.max_rooms,
            t.current_rooms,
            t.max_rooms_included,
            t.country_code,
            t.config,
            t.created_at,
            ob.id as onboarding_email_id,
            ob.status as onboarding_email_status,
            ob.created_at as onboarding_email_sent_at,
            ob.opened_at as onboarding_email_opened_at,
            ob.clicked_at as onboarding_email_clicked_at
          FROM tenants t
          LEFT JOIN LATERAL (
            SELECT et.*
            FROM email_tracking et
            WHERE (
                et.email_type = 'onboarding'
                OR (
                  et.email_type = 'custom'
                  AND (
                    et.subject ILIKE '%onboarding%'
                    OR et.subject ILIKE '%lista de espera%'
                    OR et.subject ILIKE '%Bienvenido a Delf%'
                    OR et.subject ILIKE '%confirma tu acceso%'
                  )
                )
              )
              AND (
                et.tenant_id = t.id::uuid
                OR LOWER(TRIM(et.recipient_email)) = LOWER(TRIM(t.email))
              )
            ORDER BY et.created_at DESC
            LIMIT 1
          ) ob ON true
          ORDER BY t.created_at DESC
        `
      : await sql`
          SELECT
            t.id,
            t.name,
            t.email,
            t.plan_id,
            t.plan_type,
            t.status,
            t.onboarding_status,
            t.max_rooms,
            t.current_rooms,
            t.max_rooms_included,
            t.country_code,
            t.config,
            t.created_at,
            NULL::uuid as onboarding_email_id,
            NULL::varchar as onboarding_email_status,
            NULL::timestamptz as onboarding_email_sent_at,
            NULL::timestamptz as onboarding_email_opened_at,
            NULL::timestamptz as onboarding_email_clicked_at
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

