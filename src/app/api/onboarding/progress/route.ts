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
    if (onboardingStatus === 'completed') {
      return NextResponse.json({
        success: true,
        onboarding_status: 'completed',
        pending_steps: [] as OnboardingProgressStep[],
        pending_count: 0,
      });
    }

    const empresa = await sql`
      SELECT 1 FROM empresa_config WHERE tenant_id = ${tenantId} LIMIT 1
    `;
    const hasCompany = empresa.rows.length > 0;

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

    const passwordDone = onboardingStatus !== 'pending';

    const steps: OnboardingProgressStep[] = [
      { id: 'password', done: passwordDone },
      { id: 'company', done: hasCompany },
      { id: 'plan', done: onboardingStatus === 'in_progress' || hasCompany },
      { id: 'units', done: roomCount > 0 },
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
