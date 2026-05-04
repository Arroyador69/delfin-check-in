import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId, getTenantById } from '@/lib/tenant';
import { verifyToken } from '@/lib/auth';
import { effectivePlatformAdmin } from '@/lib/platform-owner';
import { isProForReputation, isPlausibleGoogleReviewUrl } from '@/lib/reputation-google';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) tenantId = await getTenantId(req);
  return tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Hardening: columna por propiedad para el enlace de reseña
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS google_review_url TEXT`;
    } catch (_) {}

    const rows = await sql`
      SELECT
        tp.id,
        tp.property_name,
        COALESCE(tp.google_review_url, '') AS google_review_url,
        prm.room_id
      FROM tenant_properties tp
      LEFT JOIN property_room_map prm
        ON prm.tenant_id = tp.tenant_id::uuid AND prm.property_id = tp.id
      WHERE tp.tenant_id = ${tenantId}::uuid
      ORDER BY tp.created_at DESC NULLS LAST, tp.id DESC
    `;

    return NextResponse.json({
      success: true,
      properties: rows.rows.map((r: any) => ({
        id: Number(r.id),
        property_name: String(r.property_name || ''),
        google_review_url: String(r.google_review_url || ''),
        room_id: r.room_id != null ? String(r.room_id) : null,
      })),
      total: rows.rows.length,
    });
  } catch (e) {
    console.error('[reputation-google properties GET]', e);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const token = req.cookies.get('auth_token')?.value;
    const payload = token ? verifyToken(token) : null;
    const isPlatformAdmin = effectivePlatformAdmin(
      payload?.isPlatformAdmin,
      payload?.email
    );

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    if (!isProForReputation(tenant) && !isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Disponible solo en plan Pro' },
        { status: 403 }
      );
    }

    // Hardening: columna por propiedad para el enlace de reseña
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS google_review_url TEXT`;
    } catch (_) {}

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const propertyIdRaw = body.propertyId;
    const propertyId = typeof propertyIdRaw === 'number' ? propertyIdRaw : Number(propertyIdRaw);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ success: false, error: 'propertyId inválido' }, { status: 400 });
    }

    const url = typeof body.googleReviewUrl === 'string' ? body.googleReviewUrl.trim() : '';
    if (url && !isPlausibleGoogleReviewUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'El enlace no parece un enlace de Google (Maps, Perfil de empresa o g.page). Revísalo y vuelve a guardar.',
        },
        { status: 400 }
      );
    }

    const updated = await sql`
      UPDATE tenant_properties
      SET google_review_url = ${url || null},
          updated_at = NOW()
      WHERE id = ${propertyId}
        AND tenant_id = ${tenantId}::uuid
      RETURNING id, property_name, COALESCE(google_review_url, '') AS google_review_url
    `;

    if (updated.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Propiedad no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      property: {
        id: Number(updated.rows[0].id),
        property_name: String(updated.rows[0].property_name || ''),
        google_review_url: String(updated.rows[0].google_review_url || ''),
      },
    });
  } catch (e) {
    console.error('[reputation-google properties PUT]', e);
    return NextResponse.json({ success: false, error: 'Error al guardar' }, { status: 500 });
  }
}

