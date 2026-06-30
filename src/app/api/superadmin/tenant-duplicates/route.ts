import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { findTenantDuplicateGroups } from '@/lib/tenant-duplicate-hints';

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const payload = verifyToken(authToken);
    if (!isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const result = await sql`
      SELECT id::text AS id, email, name, plan_type, polar_subscription_id, onboarding_status
      FROM tenants
      ORDER BY created_at DESC
      LIMIT 2000
    `;

    const groups = findTenantDuplicateGroups(
      result.rows as Array<{ id: string; email: string; name: string; plan_type?: string | null }>
    );

    return NextResponse.json({
      success: true,
      groups,
      count: groups.length,
    });
  } catch (e) {
    console.error('[superadmin tenant-duplicates]', e);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
