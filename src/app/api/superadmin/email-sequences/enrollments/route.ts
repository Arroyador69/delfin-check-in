import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { loadTenantLifecycleState } from '@/lib/email-sequences/segment';
import { seedEmailSequences } from '@/lib/email-sequences/schema';
import { listLifecycleEnrollments } from '@/lib/email-sequences/list-enrollments-query';

async function requireSuperAdmin(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) return null;
  const payload = verifyToken(authToken);
  if (!isEffectiveSuperAdminPayload(payload)) return null;
  return payload;
}

export async function GET(req: NextRequest) {
  try {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  await seedEmailSequences();

  const phaseParam = req.nextUrl.searchParams.get('phase');
  const statusParam = req.nextUrl.searchParams.get('status');
  const parsedPhase = phaseParam ? parseInt(phaseParam, 10) : NaN;
  const phaseNum = Number.isFinite(parsedPhase) ? parsedPhase : null;
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

  const rows = await listLifecycleEnrollments({ phase: phaseNum, status: statusVal });

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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email-sequences/enrollments]', e);
    return NextResponse.json(
      { success: false, error: 'Error al cargar inscripciones', details: msg },
      { status: 500 }
    );
  }
}
