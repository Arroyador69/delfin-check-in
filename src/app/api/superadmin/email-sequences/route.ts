import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { reconcileLifecycleEngagement } from '@/lib/email-sequences/engagement-reconcile';
import {
  processLifecycleEmailQueue,
  syncLifecycleEnrollments,
} from '@/lib/email-sequences/engine';
import { seedEmailSequences } from '@/lib/email-sequences/schema';
import {
  MIR_CREDENTIALS_VIDEO_URL,
  ONBOARDING_VIDEO_URL,
  SEQUENCE_KEY_PHASE_1,
  SEQUENCE_KEY_PHASE_2,
} from '@/lib/email-sequences/constants';

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

  const funnel = await sql`
    SELECT
      COUNT(*) FILTER (WHERE onboarding_status IS DISTINCT FROM 'completed')::int AS onboarding_incomplete,
      COUNT(*) FILTER (WHERE onboarding_status = 'completed')::int AS onboarding_complete,
      COUNT(*) FILTER (
        WHERE onboarding_status = 'completed' AND COALESCE(current_rooms, 0) >= 1
      )::int AS with_property,
      COUNT(*) FILTER (
        WHERE plan_type IN ('checkin', 'standard', 'pro')
          OR plan_id IN ('standard', 'pro', 'enterprise', 'premium', 'checkin')
      )::int AS paid_plan,
      COUNT(*)::int AS total
    FROM tenants
    WHERE email IS NOT NULL AND TRIM(email) <> ''
  `;

  const enrollments = await sql`
    SELECT
      s.key AS sequence_key,
      s.name AS sequence_name,
      s.phase,
      e.status,
      COUNT(*)::int AS count
    FROM email_sequence_enrollments e
    JOIN email_sequences s ON s.id = e.sequence_id
    GROUP BY s.key, s.name, s.phase, e.status
    ORDER BY s.phase, s.key, e.status
  `;

  const stepStats = await sql`
    SELECT
      et.metadata->>'sequence_key' AS sequence_key,
      et.metadata->>'template_key' AS template_key,
      (et.metadata->>'step_order')::int AS step_order,
      COUNT(*)::int AS sent,
      COUNT(*) FILTER (WHERE et.opened_at IS NOT NULL OR et.status IN ('opened', 'clicked'))::int AS opened,
      COUNT(*) FILTER (WHERE et.clicked_at IS NOT NULL OR et.status = 'clicked')::int AS clicked
    FROM email_tracking et
    WHERE et.metadata->>'lifecycle' = 'true'
    GROUP BY 1, 2, 3
    ORDER BY sequence_key, step_order
  `;

  const unsubCount = await sql`
    SELECT COUNT(*)::int AS c FROM email_unsubscribes WHERE scope IN ('all', 'lifecycle')
  `;

  const dueNow = await sql`
    SELECT COUNT(*)::int AS c FROM email_sequence_enrollments
    WHERE status = 'active' AND next_send_at IS NOT NULL AND next_send_at <= NOW()
  `;

  const activeEnrollments = await sql`
    SELECT COUNT(*)::int AS c FROM email_sequence_enrollments WHERE status = 'active'
  `;

  return NextResponse.json({
    success: true,
    funnel: funnel.rows[0] || {},
    enrollments: enrollments.rows,
    step_stats: stepStats.rows,
    unsubscribed_count: unsubCount.rows[0]?.c ?? 0,
    due_now: dueNow.rows[0]?.c ?? 0,
    active_enrollments: activeEnrollments.rows[0]?.c ?? 0,
    video_url: ONBOARDING_VIDEO_URL,
    mir_video_url: MIR_CREDENTIALS_VIDEO_URL,
    engagement_rules: {
      days_after_open: 1,
      days_without_open_retry: 4,
      max_retries_per_step: 12,
      description:
        'Solo avanza al siguiente mail si abrió el actual (+1 día). Sin apertura: reintento del mismo mail a los 4 días.',
    },
    sequences: [
      { key: SEQUENCE_KEY_PHASE_1, phase: 1, steps: 7 },
      { key: SEQUENCE_KEY_PHASE_2, phase: 2, steps: 4 },
    ],
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'sync');

  try {
    if (action === 'sync') {
      const sync = await syncLifecycleEnrollments();
      const reconcile = await reconcileLifecycleEngagement();
      return NextResponse.json({ success: true, action, ...sync, reconcile });
    }

    if (action === 'reconcile') {
      const reconcile = await reconcileLifecycleEngagement({
        dryRun: Boolean(body.dryRun),
        maxInferences: body.maxInferences ? Number(body.maxInferences) : 200,
      });
      return NextResponse.json({ success: true, action, ...reconcile });
    }

    if (action === 'run') {
      const dryRun = Boolean(body.dryRun);
      const maxSends = body.maxSends ? Number(body.maxSends) : 40;
      const result = await processLifecycleEmailQueue({ dryRun, maxSends });
      return NextResponse.json({ success: true, action, dryRun, ...result });
    }

    if (action === 'activate') {
      const sync = await syncLifecycleEnrollments();
      await reconcileLifecycleEngagement();
      const result = await processLifecycleEmailQueue({
        dryRun: false,
        maxSends: body.maxSends ? Number(body.maxSends) : 80,
        skipReconcile: true,
      });
      return NextResponse.json({
        success: true,
        action,
        ...sync,
        sent: result.sent,
        skipped: result.skipped,
        errors: result.errors,
      });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
