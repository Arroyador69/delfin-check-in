import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

export type OnboardingProgressStep = {
  id: string;
  done: boolean;
};

/**
 * GET /api/onboarding/progress — pasos pendientes para banner y reanudar onboarding.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const tenantRow = await sql`
      SELECT onboarding_status, config
      FROM tenants
      WHERE id = ${tenantId}::uuid
      LIMIT 1
    `;
    const tenant = tenantRow.rows[0] as
      | { onboarding_status?: string | null; config?: Record<string, unknown> | null }
      | undefined;
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const onboardingStatus = String(tenant.onboarding_status || 'pending').toLowerCase();
    const config = (tenant.config as Record<string, unknown> | null) || {};
    const deferredRaw = Array.isArray(config.onboarding_deferred)
      ? (config.onboarding_deferred as string[])
      : [];

    let roomCount = 0;
    try {
      const rooms = await sql`
        SELECT COUNT(DISTINCT r.id)::int AS c
        FROM "Room" r
        WHERE r."lodgingId"::text = ${tenantId}
           OR r.tenant_id = ${tenantId}::uuid
      `;
      roomCount = Number(rooms.rows[0]?.c || 0);
    } catch {
      roomCount = 0;
    }

    let hasMir = false;
    try {
      const mir = await sql`
        SELECT 1 FROM mir_credenciales WHERE tenant_id = ${tenantId}::uuid AND activo = true LIMIT 1
      `;
      hasMir = mir.rows.length > 0;
    } catch {
      hasMir = false;
    }

    if (onboardingStatus === 'completed') {
      const deferredPending: OnboardingProgressStep[] = [];
      if (deferredRaw.includes('company') && !hasCompany) {
        deferredPending.push({ id: 'company', done: false });
      }
      if (deferredRaw.includes('units') && roomCount === 0) {
        deferredPending.push({ id: 'units', done: false });
      }
      if (deferredRaw.includes('mir') && !hasMir) {
        deferredPending.push({ id: 'mir', done: false });
      }
      if (deferredRaw.includes('stripe')) {
        deferredPending.push({ id: 'stripe', done: false });
      }
      if (deferredRaw.includes('property_profile')) {
        deferredPending.push({ id: 'property_profile', done: false });
      }

      return NextResponse.json({
        success: true,
        onboarding_status: 'completed',
        pending_steps: deferredPending,
        pending_count: deferredPending.length,
        deferred_setup: deferredPending.length > 0,
        room_count: roomCount,
        has_mir: hasMir,
      });
    }

    const empresa = await sql`
      SELECT 1 FROM empresa_config WHERE tenant_id = ${tenantId} LIMIT 1
    `;
    const hasCompany = empresa.rows.length > 0;

    let roomCountInProgress = roomCount;

    const passwordDone = onboardingStatus !== 'pending';

    const steps: OnboardingProgressStep[] = [
      { id: 'password', done: passwordDone },
      { id: 'company', done: hasCompany },
      { id: 'plan', done: onboardingStatus === 'in_progress' || hasCompany },
      { id: 'units', done: roomCountInProgress > 0 },
      { id: 'mir', done: hasMir },
    ];

    const pending = steps.filter((s) => !s.done);

    return NextResponse.json({
      success: true,
      onboarding_status: onboardingStatus,
      pending_steps: pending,
      pending_count: pending.length,
      room_count: roomCount,
      has_mir: hasMir,
      has_company: hasCompany,
    });
  } catch (e) {
    console.error('[onboarding/progress]', e);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
