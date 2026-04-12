import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getTenantById } from '@/lib/tenant'
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan'

// Estructura: checkin_instructions
// - id SERIAL PK
// - tenant_id UUID
// - room_id TEXT NULL (si NULL = instrucciones por defecto del tenant)
// - title TEXT NULL
// - body_html TEXT NOT NULL
// - updated_at TIMESTAMPTZ DEFAULT now()

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS checkin_instructions (
      id SERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      room_id TEXT NULL,
      title TEXT NULL,
      body_html TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_checkin_instructions_tenant_room ON checkin_instructions(tenant_id, room_id)`
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id')
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenant_id requerido' }, { status: 400 })
    await ensureTable()

    const roomId = req.nextUrl.searchParams.get('room_id')
    let rows
    if (roomId) {
      const res = await sql`SELECT * FROM checkin_instructions WHERE tenant_id = ${tenantId}::uuid AND room_id = ${roomId}::text`
      rows = res.rows
    } else {
      const res = await sql`SELECT * FROM checkin_instructions WHERE tenant_id = ${tenantId}::uuid ORDER BY (room_id IS NULL) DESC, updated_at DESC`
      rows = res.rows
    }
    return NextResponse.json({ success: true, items: rows })
  } catch (e: any) {
    console.error('❌ [checkin-instructions][GET]', e)
    return NextResponse.json({ success: false, error: e.message || 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id')
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenant_id requerido' }, { status: 400 })

    const tenant = await getTenantById(tenantId)
    if (!tenant || !hasCheckinInstructionsEmailPlan(tenant)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Las instrucciones de check-in por email están disponibles en los planes Standard y Pro.',
          code: 'PLAN_REQUIRED',
        },
        { status: 403 }
      )
    }

    await ensureTable()

    const body = await req.json()
    const { room_id, title, body_html } = body || {}
    if (!body_html || typeof body_html !== 'string') {
      return NextResponse.json({ success: false, error: 'body_html requerido' }, { status: 400 })
    }

    // Upsert por (tenant_id, room_id)
    const upsert = await sql`
      INSERT INTO checkin_instructions (tenant_id, room_id, title, body_html)
      VALUES (${tenantId}::uuid, ${room_id || null}, ${title || null}, ${body_html})
      ON CONFLICT DO NOTHING
    `
    if (upsert.rowCount === 0) {
      await sql`
        UPDATE checkin_instructions
        SET title = ${title || null}, body_html = ${body_html}, updated_at = now()
        WHERE tenant_id = ${tenantId}::uuid AND room_id IS NOT DISTINCT FROM ${room_id || null}
      `
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('❌ [checkin-instructions][PUT]', e)
    return NextResponse.json({ success: false, error: e.message || 'Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id')
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'tenant_id requerido' }, { status: 400 })
    }

    const tenant = await getTenantById(tenantId)
    if (!tenant || !hasCheckinInstructionsEmailPlan(tenant)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Las instrucciones de check-in por email están disponibles en los planes Standard y Pro.',
          code: 'PLAN_REQUIRED',
        },
        { status: 403 }
      )
    }

    await ensureTable()

    const idRaw = req.nextUrl.searchParams.get('id')
    const id = idRaw ? parseInt(idRaw, 10) : NaN
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ success: false, error: 'id inválido' }, { status: 400 })
    }

    const del = await sql`
      DELETE FROM checkin_instructions
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}
    `
    if (del.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('❌ [checkin-instructions][DELETE]', e)
    return NextResponse.json({ success: false, error: e.message || 'Error' }, { status: 500 })
  }
}

