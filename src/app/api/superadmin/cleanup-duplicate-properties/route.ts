import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import {
  findDuplicateStubPropertyIds,
  type TenantPropertyRow,
} from '@/lib/tenant-properties-dedup';

/**
 * POST: elimina fichas stub duplicadas (€50 sin fotos) cuando existe otra ficha completa
 * con el mismo nombre. No toca placeholders virtuales ni propiedades con reservas.
 *
 * Body opcional: { tenant_id?: string, dry_run?: boolean }
 */
export async function POST(req: NextRequest) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const tenantIdFilter = body?.tenant_id ? String(body.tenant_id).trim() : null;
    const dryRun = Boolean(body?.dry_run);

    const tenantsRes = tenantIdFilter
      ? await sql`SELECT id::text AS id, name FROM tenants WHERE id = ${tenantIdFilter}::uuid`
      : await sql`SELECT id::text AS id, name FROM tenants ORDER BY created_at DESC`;

    const summary: Array<{
      tenant_id: string;
      tenant_name: string;
      deleted_ids: number[];
      skipped_ids: number[];
    }> = [];

    for (const tenant of tenantsRes.rows as Array<{ id: string; name: string }>) {
      const propsRes = await sql`
        SELECT
          tp.id,
          tp.property_name,
          tp.description,
          tp.photos,
          tp.base_price,
          prm.room_id::text AS room_id,
          tp.updated_at,
          tp.created_at,
          tp.google_review_url
        FROM tenant_properties tp
        LEFT JOIN property_room_map prm
          ON prm.property_id = tp.id AND prm.tenant_id = tp.tenant_id
        WHERE tp.tenant_id = ${tenant.id}::uuid
      `;

      const rows = propsRes.rows as TenantPropertyRow[];
      const candidateIds = findDuplicateStubPropertyIds(rows);
      const deletedIds: number[] = [];
      const skippedIds: number[] = [];

      for (const propertyId of candidateIds) {

        const reservations = await sql`
          SELECT COUNT(*)::int AS c FROM direct_reservations
          WHERE property_id = ${propertyId} AND tenant_id = ${tenant.id}::uuid
        `;
        if ((reservations.rows[0]?.c as number) > 0) {
          skippedIds.push(propertyId);
          continue;
        }

        if (dryRun) {
          deletedIds.push(propertyId);
          continue;
        }

        await sql`DELETE FROM property_room_map WHERE property_id = ${propertyId} AND tenant_id = ${tenant.id}::uuid`;
        await sql`DELETE FROM tenant_properties WHERE id = ${propertyId} AND tenant_id = ${tenant.id}::uuid`;
        deletedIds.push(propertyId);
      }

      if (deletedIds.length || skippedIds.length) {
        summary.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          deleted_ids: deletedIds,
          skipped_ids: skippedIds,
        });
      }
    }

    const totalDeleted = summary.reduce((n, s) => n + s.deleted_ids.length, 0);

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      tenants_affected: summary.length,
      total_deleted: totalDeleted,
      summary,
    });
  } catch (e) {
    console.error('[superadmin cleanup-duplicate-properties]', e);
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
