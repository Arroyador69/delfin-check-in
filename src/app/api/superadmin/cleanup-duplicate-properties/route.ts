import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { logError } from '@/lib/error-logger';
import {
  findDuplicateStubPropertyIds,
  type TenantPropertyRow,
} from '@/lib/tenant-properties-dedup';

type CleanupSummaryRow = {
  tenant_id: string;
  tenant_name: string;
  deleted_ids: number[];
  skipped_ids: number[];
  error?: string;
};

async function ensureCleanupSchema(): Promise<void> {
  try {
    await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS google_review_url TEXT`;
  } catch (_) {}
}

async function tableExists(tableName: string): Promise<boolean> {
  const r = await sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tableName}
    LIMIT 1
  `;
  return r.rows.length > 0;
}

function dedupePropertyRows(rows: TenantPropertyRow[]): TenantPropertyRow[] {
  const byId = new Map<number, TenantPropertyRow>();
  for (const row of rows) {
    if (row.id == null) continue;
    const id = Number(row.id);
    const prev = byId.get(id);
    if (!prev || (row.room_id && !prev.room_id)) {
      byId.set(id, row);
    }
  }
  return Array.from(byId.values());
}

async function propertyHasReservations(propertyId: number, tenantId: string): Promise<boolean> {
  if (!(await tableExists('direct_reservations'))) return false;
  const reservations = await sql`
    SELECT COUNT(*)::int AS c
    FROM direct_reservations
    WHERE property_id = ${propertyId} AND tenant_id = ${tenantId}::uuid
  `;
  return ((reservations.rows[0]?.c as number) || 0) > 0;
}

async function cleanupTenantProperties(
  tenant: { id: string; name: string },
  dryRun: boolean
): Promise<CleanupSummaryRow | null> {
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

  const rows = dedupePropertyRows(propsRes.rows as TenantPropertyRow[]);
  const candidateIds = findDuplicateStubPropertyIds(rows);
  if (candidateIds.length === 0) return null;

  const deletedIds: number[] = [];
  const skippedIds: number[] = [];

  for (const propertyId of candidateIds) {
    if (await propertyHasReservations(propertyId, tenant.id)) {
      skippedIds.push(propertyId);
      continue;
    }

    if (dryRun) {
      deletedIds.push(propertyId);
      continue;
    }

    if (await tableExists('property_room_map')) {
      await sql`
        DELETE FROM property_room_map
        WHERE property_id = ${propertyId} AND tenant_id = ${tenant.id}::uuid
      `;
    }
    await sql`
      DELETE FROM tenant_properties
      WHERE id = ${propertyId} AND tenant_id = ${tenant.id}::uuid
    `;
    deletedIds.push(propertyId);
  }

  if (!deletedIds.length && !skippedIds.length) return null;

  return {
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    deleted_ids: deletedIds,
    skipped_ids: skippedIds,
  };
}

/**
 * POST: elimina fichas stub duplicadas (€50 sin fotos) cuando existe otra ficha completa
 * con el mismo nombre. No toca placeholders virtuales ni propiedades con reservas.
 *
 * Body opcional:
 * - tenant_id?: string — solo un tenant
 * - dry_run?: boolean — simular (default false)
 * - limit?: number — tenants por lote (default 40, max 100)
 * - offset?: number — paginación
 */
export async function POST(req: NextRequest) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  const url = req.nextUrl.pathname;

  try {
    await ensureCleanupSchema();

    const body = await req.json().catch(() => ({}));
    const tenantIdFilter = body?.tenant_id ? String(body.tenant_id).trim() : null;
    const dryRun = Boolean(body?.dry_run);
    const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), 100);
    const offset = Math.max(Number(body?.offset) || 0, 0);

    let tenantsRes;
    if (tenantIdFilter) {
      tenantsRes = await sql`
        SELECT id::text AS id, name
        FROM tenants
        WHERE id = ${tenantIdFilter}::uuid
        LIMIT 1
      `;
    } else {
      tenantsRes = await sql`
        SELECT id::text AS id, name
        FROM tenants
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }

    const totalTenantsRes = tenantIdFilter
      ? { rows: [{ c: tenantsRes.rows.length ? 1 : 0 }] }
      : await sql`SELECT COUNT(*)::int AS c FROM tenants`;

    const summary: CleanupSummaryRow[] = [];

    for (const tenant of tenantsRes.rows as Array<{ id: string; name: string }>) {
      try {
        const row = await cleanupTenantProperties(tenant, dryRun);
        if (row) summary.push(row);
      } catch (tenantErr) {
        const msg = tenantErr instanceof Error ? tenantErr.message : String(tenantErr);
        summary.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          deleted_ids: [],
          skipped_ids: [],
          error: msg,
        });
      }
    }

    const totalDeleted = summary.reduce((n, s) => n + s.deleted_ids.length, 0);
    const totalTenants = Number(totalTenantsRes.rows[0]?.c || 0);
    const nextOffset = tenantIdFilter ? null : offset + tenantsRes.rows.length;
    const hasMore = tenantIdFilter ? false : nextOffset != null && nextOffset < totalTenants;

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      tenants_scanned: tenantsRes.rows.length,
      tenants_affected: summary.filter((s) => s.deleted_ids.length || s.skipped_ids.length).length,
      tenants_with_errors: summary.filter((s) => s.error).length,
      total_deleted: totalDeleted,
      pagination: tenantIdFilter
        ? null
        : {
            limit,
            offset,
            next_offset: hasMore ? nextOffset : null,
            total_tenants: totalTenants,
            has_more: hasMore,
          },
      summary,
    });
  } catch (e) {
    console.error('[superadmin cleanup-duplicate-properties]', e);
    const msg = e instanceof Error ? e.message : 'Error interno';
    void logError({
      level: 'error',
      message: `[cleanup-duplicate-properties] ${msg}`,
      error: e,
      url,
      metadata: { source: 'superadmin-cleanup-duplicate-properties' },
    });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
