import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { loadTenantLifecycleState } from '@/lib/email-sequences/segment';
import { seedEmailSequences } from '@/lib/email-sequences/schema';

async function requireSuperAdmin(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) return null;
  const payload = verifyToken(authToken);
  if (!isEffectiveSuperAdminPayload(payload)) return null;
  return payload;
}

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  await seedEmailSequences();

  const phaseParam = req.nextUrl.searchParams.get('phase');
  const statusParam = req.nextUrl.searchParams.get('status');
  const phaseNum = phaseParam ? parseInt(phaseParam, 10) : null;
  const statusVal = statusParam && statusParam.length > 0 ? statusParam : null;

  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  if (tenantId) {
    const state = await loadTenantLifecycleState(tenantId);
    const enrollments = await sql`
      SELECT
        e.*,
        s.key AS sequence_key,
        s.name AS sequence_name,
        s.phase
      FROM email_sequence_enrollments e
      JOIN email_sequences s ON s.id = e.sequence_id
      WHERE e.tenant_id = ${tenantId}::uuid
      ORDER BY s.phase ASC
    `;

    const emails = await sql`
      SELECT
        id,
        subject,
        status,
        created_at,
        opened_at,
        clicked_at,
        metadata
      FROM email_tracking
      WHERE tenant_id = ${tenantId}::uuid
        AND metadata->>'lifecycle' = 'true'
      ORDER BY created_at DESC
    `;

    const steps = await sql`
      SELECT ss.step_order, ss.template_key, ss.delay_days, ss.condition_json, s.key AS sequence_key
      FROM email_sequence_steps ss
      JOIN email_sequences s ON s.id = ss.sequence_id
      ORDER BY s.phase, ss.step_order
    `;

    return NextResponse.json({
      success: true,
      tenant: state,
      enrollments: enrollments.rows,
      emails: emails.rows,
      steps: steps.rows,
    });
  }

  const rows = await sql`
    SELECT
      e.id AS enrollment_id,
      e.tenant_id,
      t.name AS tenant_name,
      t.email,
      t.onboarding_status,
      COALESCE(t.current_rooms, 0)::int AS current_rooms,
      t.plan_type,
      e.current_step,
      e.status AS enrollment_status,
      e.enrolled_at,
      e.last_sent_at,
      e.next_send_at,
      e.completed_at,
      e.metadata,
      s.key AS sequence_key,
      s.name AS sequence_name,
      s.phase,
      (SELECT COUNT(*)::int FROM email_tracking et
        WHERE et.tenant_id = e.tenant_id
          AND et.metadata->>'lifecycle' = 'true'
          AND et.metadata->>'sequence_key' = s.key) AS emails_sent,
      (SELECT COUNT(*)::int FROM email_tracking et
        WHERE et.tenant_id = e.tenant_id
          AND et.metadata->>'lifecycle' = 'true'
          AND et.metadata->>'sequence_key' = s.key
          AND (et.opened_at IS NOT NULL OR et.clicked_at IS NOT NULL OR et.status IN ('opened', 'clicked'))) AS emails_opened,
      (SELECT COUNT(*)::int FROM email_tracking et
        WHERE et.metadata->>'enrollment_id' = e.id::text
          AND (et.metadata->>'step_order')::int = e.current_step) AS sends_on_current_step,
      (SELECT BOOL_OR(et.opened_at IS NOT NULL OR et.clicked_at IS NOT NULL OR et.status IN ('opened', 'clicked'))
        FROM email_tracking et
        WHERE et.metadata->>'enrollment_id' = e.id::text
          AND (et.metadata->>'step_order')::int = e.current_step) AS current_step_opened,
      COALESCE((e.metadata->>'step_retry_count')::int, 0) AS step_retry_count
    FROM email_sequence_enrollments e
    JOIN email_sequences s ON s.id = e.sequence_id
    JOIN tenants t ON t.id = e.tenant_id
    WHERE (${phaseNum} IS NULL OR s.phase = ${phaseNum})
      AND (${statusVal} IS NULL OR e.status = ${statusVal})
    ORDER BY e.next_send_at ASC NULLS LAST, e.enrolled_at DESC
    LIMIT 200
  `;

  const enrollments = rows.rows.map((row) => {
    const sendsOnStep = Number(row.sends_on_current_step || 0);
    const stepOpened = Boolean(row.current_step_opened);
    const retries = Number(row.step_retry_count || 0);
    let engagement_status = 'pendiente_primer_envio';
    if (sendsOnStep === 0) {
      engagement_status = 'pendiente_primer_envio';
    } else if (stepOpened) {
      engagement_status = 'abierto_siguiente_paso';
    } else if (retries > 0) {
      engagement_status = 'reintento_sin_abrir';
    } else {
      engagement_status = 'esperando_apertura';
    }
    return { ...row, engagement_status };
  });

  return NextResponse.json({
    success: true,
    enrollments,
    filters: { phase: phaseParam, status: statusVal },
    engagement_rules: {
      days_after_open: 1,
      days_without_open_retry: 4,
      max_retries_per_step: 12,
    },
  });
}
