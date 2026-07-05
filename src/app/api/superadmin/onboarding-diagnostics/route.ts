import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { sql } from '@/lib/db';
import {
  buildOnboardingUrl,
  ensureOnboardingMagicTokenSchema,
} from '@/lib/onboarding-magic-link';
import { loadTenantLifecycleState } from '@/lib/email-sequences/segment';
import { findTenantDuplicateGroups } from '@/lib/tenant-duplicate-hints';
import { resolveEffectivePlanType } from '@/lib/tenant-plan-billing';

/**
 * GET /api/superadmin/onboarding-diagnostics?email=
 * Estado del tenant: onboarding, lifecycle, habitaciones, Polar y posibles duplicados.
 */
export async function GET(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const payload = verifyToken(authToken);
  if (!payload || !isEffectiveSuperAdminPayload(payload)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const emailRaw = req.nextUrl.searchParams.get('email');
  if (!emailRaw?.includes('@')) {
    return NextResponse.json({ error: 'Parámetro email requerido' }, { status: 400 });
  }

  await ensureOnboardingMagicTokenSchema();
  const email = emailRaw.trim().toLowerCase();

  const allTenants = await sql`
    SELECT
      t.id::text AS id,
      t.email,
      t.name,
      t.plan_type,
      t.plan_id,
      t.polar_subscription_id,
      t.polar_subscription_status,
      t.polar_customer_id,
      t.onboarding_status,
      t.status,
      COALESCE(t.current_rooms, 0)::int AS current_rooms,
      t.lodging_id
    FROM tenants t
    WHERE LOWER(TRIM(t.email)) = ${email}
       OR EXISTS (
         SELECT 1 FROM tenant_users tu
         WHERE tu.tenant_id = t.id
           AND tu.role = 'owner'
           AND tu.is_active = true
           AND LOWER(TRIM(tu.email)) = ${email}
       )
    ORDER BY t.created_at DESC
  `;

  if (!allTenants.rows.length) {
    const dupHint = findTenantDuplicateGroups(
      (
        await sql`
          SELECT id::text AS id, email, name
          FROM tenants
          WHERE email IS NOT NULL AND TRIM(email) <> ''
          ORDER BY created_at DESC
          LIMIT 500
        `
      ).rows as Array<{ id: string; email: string; name: string }>
    ).filter((g) =>
      g.tenants.some((t) => t.email.toLowerCase().includes(email.split('@')[0]))
    );

    return NextResponse.json(
      {
        found: false,
        email,
        possible_duplicate_groups: dupHint.slice(0, 3),
      },
      { status: 404 }
    );
  }

  const tenants = await Promise.all(
    allTenants.rows.map(async (row) => {
      const tenantId = String(row.id);
      const lifecycle = await loadTenantLifecycleState(tenantId);

      let lifecycleEnrollment: Record<string, unknown> | null = null;
      try {
        const enr = await sql`
          SELECT
            e.status,
            e.current_step,
            e.next_send_at,
            s.key AS sequence_key,
            s.name AS sequence_name
          FROM email_sequence_enrollments e
          JOIN email_sequences s ON s.id = e.sequence_id
          WHERE e.tenant_id = ${tenantId}::uuid
            AND e.status = 'active'
          ORDER BY e.enrolled_at DESC
          LIMIT 1
        `;
        if (enr.rows[0]) lifecycleEnrollment = enr.rows[0] as Record<string, unknown>;
      } catch {
        /* tabla puede no existir en entornos viejos */
      }

      const owner = await sql`
        SELECT id::text AS id, email, onboarding_magic_token, onboarding_magic_token_expires,
               reset_token, reset_token_expires, email_verified
        FROM tenant_users
        WHERE tenant_id = ${tenantId}::uuid AND role = 'owner' AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const ownerRow = owner.rows[0] as Record<string, unknown> | undefined;
      const magic = ownerRow?.onboarding_magic_token as string | null;
      const magicExp = ownerRow?.onboarding_magic_token_expires as string | Date | null;
      const magicValid = !!magic && !!magicExp && new Date(magicExp) > new Date();

      const effectivePlan = resolveEffectivePlanType({
        plan_type: row.plan_type,
        plan_id: row.plan_id,
      });

      return {
        tenant: {
          id: tenantId,
          name: row.name,
          email: row.email,
          status: row.status,
          onboarding_status: row.onboarding_status,
          plan_type: row.plan_type,
          plan_id: row.plan_id,
          effective_plan: effectivePlan,
          polar_subscription_id: row.polar_subscription_id,
          polar_subscription_status: row.polar_subscription_status,
          polar_customer_id: row.polar_customer_id,
          current_rooms: row.current_rooms,
          lodging_id: row.lodging_id,
        },
        lifecycle: lifecycle
          ? {
              segment: lifecycle.segment,
              phase_1_goal_met: lifecycle.phase_1_goal_met,
              phase_2_goal_met: lifecycle.phase_2_goal_met,
              properties_count: lifecycle.properties_count,
              room_rows_count: lifecycle.room_rows_count,
              reservations_count: lifecycle.reservations_count,
              active_enrollment: lifecycleEnrollment,
              why_phase_1_open:
                !lifecycle.phase_1_goal_met
                  ? lifecycle.reservations_count < 1 &&
                    row.onboarding_status !== 'completed'
                    ? 'onboarding no completado y sin reservas'
                    : lifecycle.reservations_count < 1
                      ? 'onboarding incompleto o sin unidad registrada'
                      : null
                  : null,
            }
          : null,
        owner: ownerRow
          ? {
              id: ownerRow.id,
              email: ownerRow.email,
              email_verified: ownerRow.email_verified,
              magic_link_valid: magicValid,
              onboarding_url: magicValid && magic ? buildOnboardingUrl(magic, 'es') : null,
            }
          : null,
      };
    })
  );

  const duplicateGroups = findTenantDuplicateGroups(
    (
      await sql`
        SELECT id::text AS id, email, name
        FROM tenants
        WHERE email IS NOT NULL AND TRIM(email) <> ''
        ORDER BY created_at DESC
        LIMIT 2000
      `
    ).rows as Array<{ id: string; email: string; name: string }>
  ).filter((g) => g.tenants.some((t) => tenants.some((x) => x.tenant.id === t.id)));

  const primary = tenants[0];
  const supportSummary = buildSupportSummary(primary, tenants.length, duplicateGroups);

  return NextResponse.json({
    found: true,
    email,
    tenant_count: tenants.length,
    tenants,
    duplicate_groups: duplicateGroups,
    support_summary: supportSummary,
  });
}

function buildSupportSummary(
  primary: {
    tenant: Record<string, unknown>;
    lifecycle: {
      phase_1_goal_met?: boolean;
      reservations_count?: number;
      room_rows_count?: number;
      active_enrollment?: Record<string, unknown> | null;
    } | null;
  },
  tenantCount: number,
  duplicateGroups: Array<{ reason: string; key: string; tenants: Array<{ email: string }> }>
): string {
  const t = primary.tenant;
  const lc = primary.lifecycle;
  const parts: string[] = [];

  parts.push(
    `Cuenta ${String(t.email)}: plan efectivo ${String(t.effective_plan)}, onboarding ${String(t.onboarding_status)}.`
  );
  if (t.polar_subscription_id) {
    parts.push(
      `Polar: suscripción ${String(t.polar_subscription_status || '?')} (${String(t.polar_subscription_id)}).`
    );
  } else {
    parts.push('Sin suscripción Polar vinculada en este tenant (plan gratuito en BD).');
  }
  if (lc) {
    parts.push(
      `Habitaciones en BD: ${lc.room_rows_count ?? 0}, reservas: ${lc.reservations_count ?? 0}.`
    );
    if (!lc.phase_1_goal_met && lc.active_enrollment) {
      parts.push(
        'Recibe emails lifecycle de onboarding porque la fase 1 no está cerrada en el sistema.'
      );
    }
    if ((lc.room_rows_count ?? 0) < 1) {
      parts.push(
        'El desplegable de habitación en reservas manuales estará vacío hasta registrar la unidad en Ajustes.'
      );
    }
  }
  if (tenantCount > 1) {
    parts.push(`Hay ${tenantCount} tenants con este email; revisar cuál usa la clienta.`);
  }
  if (duplicateGroups.length > 0) {
    const emails = duplicateGroups.flatMap((g) => g.tenants.map((x) => x.email)).join(', ');
    parts.push(`Posibles cuentas duplicadas: ${emails}.`);
  }
  return parts.join(' ');
}
