import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { authorizeCronOrSuperAdmin } from '@/lib/cron-auth';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
} from '@/lib/public-owner-leads/daily-run';
import { applyOutreachBouncesFromText } from '@/lib/public-owner-leads/apply-bounces';
import { isBlockedOutreachHost, normalizeUrl } from '@/lib/public-owner-leads/extract-web';
import {
  isPublicOwnerLeadsPaused,
  PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL,
  PUBLIC_OWNER_LEADS_COLD_DAILY_CAP,
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_DAILY_TARGET,
  PUBLIC_OWNER_LEADS_FU_DAILY_CAP,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
  PUBLIC_OWNER_LEADS_PROGRESS_EVERY,
  PUBLIC_OWNER_LEADS_WAVE_MAX,
  PUBLIC_OWNER_LEADS_WAVES_PER_DAY,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
  PUBLIC_OWNER_ONBOARDINGS_DAILY_GOAL,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from '@/lib/public-owner-leads/constants';
import { syncZohoBounces } from '@/lib/zoho-bounce-sync';
import { getOutreachProviderInfo } from '@/lib/public-owner-leads/send-smtp';
import { followUpCounts } from '@/lib/public-owner-leads/select-followups';

async function requireSuperAdmin(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) return null;
  const payload = verifyToken(authToken);
  if (!isEffectiveSuperAdminPayload(payload)) return null;
  return payload;
}

/**
 * GET: métricas campaña + listado leads (opens/clicks/altas/fechas).
 * POST: { action: 'add_sources' | 'run_daily' | 'sync_engagement' | 'sync_bounces' | 'import_bounces', ... }
 */
export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
    if (!meta.rows[0]?.reg) {
      return NextResponse.json({
        ok: true,
        table_ready: false,
        daily_target: PUBLIC_OWNER_LEADS_DAILY_TARGET,
        message:
          'Ejecuta database/migration-public-owner-leads.sql y migration-public-owner-leads-tracking.sql en Neon.',
        stats: {},
        today: {},
        by_day: [],
        leads: [],
        sources: [],
      });
    }

    await syncOutreachEngagementFromTracking();

    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 100), 500);
    const dayFilter = (req.nextUrl.searchParams.get('day') || '').trim(); // YYYY-MM-DD Madrid o '' = todos
    const statusFilter = (req.nextUrl.searchParams.get('status') || '').trim().toLowerCase();

    const stats = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE opted_out)::int AS opted_out,
        COUNT(*) FILTER (WHERE status = 'new' AND NOT opted_out)::int AS new_count,
        COUNT(*) FILTER (WHERE status = 'queued' AND NOT opted_out)::int AS queued,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'bounced')::int AS bounced,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked,
        COUNT(*) FILTER (WHERE signed_up_at IS NOT NULL)::int AS signed_up
      FROM public_owner_leads
    `;

    const today = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE COALESCE(last_touch_at, sent_at) >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid'
            AND (
              last_touch_kind IN ('cold', 'fu_click', 'fu_open', 'fu_silent')
              OR (last_touch_kind IS NULL AND status = 'sent')
            )
        )::int AS sent_today,
        COUNT(*) FILTER (
          WHERE COALESCE(last_touch_at, sent_at) >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid'
            AND (
              last_touch_kind = 'cold'
              OR (
                last_touch_kind IS NULL AND status = 'sent'
                AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
                  AT TIME ZONE 'Europe/Madrid'
              )
            )
        )::int AS cold_today,
        COUNT(*) FILTER (
          WHERE last_touch_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid'
            AND last_touch_kind IN ('fu_click', 'fu_open', 'fu_silent')
        )::int AS fu_today,
        COUNT(*) FILTER (
          WHERE last_touch_kind = 'fu_click'
            AND last_touch_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
        )::int AS fu_click_today,
        COUNT(*) FILTER (
          WHERE last_touch_kind = 'fu_open'
            AND last_touch_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
        )::int AS fu_open_today,
        COUNT(*) FILTER (
          WHERE last_touch_kind = 'fu_silent'
            AND last_touch_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
        )::int AS fu_silent_today,
        COUNT(*) FILTER (
          WHERE status = 'bounced'
            AND updated_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
        )::int AS bounced_today,
        COUNT(*) FILTER (
          WHERE opened_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
        )::int AS opened_today,
        COUNT(*) FILTER (
          WHERE clicked_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
        )::int AS clicked_today,
        COUNT(*) FILTER (
          WHERE signed_up_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
        )::int AS signed_up_today,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
        )::int AS discovered_today
      FROM public_owner_leads
    `;

    /** Entradas recientes (web + mail) para estadísticas / auditoría de captación. */
    const intakeRecent = await sql`
      SELECT
        email,
        domain,
        source_url,
        status,
        left(coalesce(notes, ''), 80) AS notes,
        created_at::text
      FROM public_owner_leads
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 40
    `;
    const intakeBySource = await sql`
      SELECT
        CASE
          WHEN notes ILIKE 'opendata:gva%' THEN 'opendata:gva'
          WHEN notes ILIKE 'opendata:jcyl%' OR notes ILIKE 'opendata:%' THEN 'opendata'
          WHEN notes ILIKE 'refill-osm%' OR notes ILIKE '%osm%' THEN 'osm'
          WHEN notes ILIKE 'refill:%' OR notes ILIKE 'extract:%' THEN 'extract'
          WHEN notes ILIKE '%flow-c%' OR notes ILIKE '%agency%' THEN 'agency'
          ELSE 'other'
        END AS source_kind,
        COUNT(*)::int AS n
      FROM public_owner_leads
      WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
        AT TIME ZONE 'Europe/Madrid'
      GROUP BY 1
      ORDER BY n DESC
    `;

    const byDayRaw = await sql`
      SELECT
        to_char(
          (sent_at AT TIME ZONE 'Europe/Madrid')::date,
          'YYYY-MM-DD'
        ) AS day,
        COUNT(*)::int AS sent,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked,
        COUNT(*) FILTER (WHERE signed_up_at IS NOT NULL)::int AS signed_up,
        COUNT(*) FILTER (WHERE status = 'bounced')::int AS bounced
      FROM public_owner_leads
      WHERE status = 'sent'
        AND sent_at IS NOT NULL
        AND sent_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 30
    `;

    // Siempre mostrar el día Madrid de hoy (aunque vaya 0) — evita “hoy no aparece”
    const todayMadrid = await sql`
      SELECT to_char((NOW() AT TIME ZONE 'Europe/Madrid')::date, 'YYYY-MM-DD') AS day
    `;
    const todayKey = String(todayMadrid.rows[0]?.day || '');
    const byDayRows = [...byDayRaw.rows];
    if (todayKey && !byDayRows.some((r) => String(r.day) === todayKey)) {
      byDayRows.unshift({
        day: todayKey,
        sent: 0,
        opened: 0,
        clicked: 0,
        signed_up: 0,
        bounced: 0,
      });
    }
    const byDay = { rows: byDayRows };

    let rows;
    if (dayFilter && /^\d{4}-\d{2}-\d{2}$/.test(dayFilter)) {
      rows = await sql`
        SELECT
          id, email, domain, source_url, status, opted_out,
          queued_at, sent_at, opened_at, clicked_at, signed_up_at,
          signed_up_tenant_id, created_at, updated_at, notes, last_error
        FROM public_owner_leads
        WHERE status = 'sent'
          AND sent_at IS NOT NULL
          AND (sent_at AT TIME ZONE 'Europe/Madrid')::date = ${dayFilter}::date
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } else if (statusFilter === 'sent') {
      rows = await sql`
        SELECT
          id, email, domain, source_url, status, opted_out,
          queued_at, sent_at, opened_at, clicked_at, signed_up_at,
          signed_up_tenant_id, created_at, updated_at, notes, last_error
        FROM public_owner_leads
        WHERE status = 'sent'
        ORDER BY sent_at DESC NULLS LAST
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT
          id, email, domain, source_url, status, opted_out,
          queued_at, sent_at, opened_at, clicked_at, signed_up_at,
          signed_up_tenant_id, created_at, updated_at, notes, last_error
        FROM public_owner_leads
        ORDER BY COALESCE(sent_at, created_at) DESC
        LIMIT ${limit}
      `;
    }

    let sources: unknown[] = [];
    const sourcesMeta = await sql`SELECT to_regclass('public.public_owner_lead_sources') AS reg`;
    if (sourcesMeta.rows[0]?.reg) {
      const s = await sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'done')::int AS done,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
          COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
        FROM public_owner_lead_sources
      `;
      const recent = await sql`
        SELECT id, url, status, emails_found, last_error, last_scraped_at, created_at
        FROM public_owner_lead_sources
        ORDER BY created_at DESC
        LIMIT 30
      `;
      sources = [{ summary: s.rows[0], recent: recent.rows }];
    }

    const st = stats.rows[0] || {};
    const sent = Number(st.sent || 0) || 1;
    const openRate = Math.round((Number(st.opened || 0) / sent) * 1000) / 10;
    const clickRate = Math.round((Number(st.clicked || 0) / sent) * 1000) / 10;
    const signupRate = Math.round((Number(st.signed_up || 0) / sent) * 1000) / 10;

    const reserve = Number(st.new_count || 0) + Number(st.queued || 0);
    const signedToday = Number((today.rows[0] as { signed_up_today?: number })?.signed_up_today || 0);
    let onboardingsToday = 0;
    try {
      const ob = await sql`
        SELECT COUNT(*)::int AS n
        FROM tenants
        WHERE onboarding_status = 'completed'
          AND updated_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid'
      `;
      onboardingsToday = Number(ob.rows[0]?.n || 0);
    } catch {
      onboardingsToday = 0;
    }

    let checkinPaidToday = 0;
    try {
      const paid = await sql`
        SELECT COUNT(*)::int AS n
        FROM tenants
        WHERE plan_type IN ('checkin', 'standard', 'pro')
          AND updated_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid'
      `;
      checkinPaidToday = Number(paid.rows[0]?.n || 0);
    } catch {
      checkinPaidToday = 0;
    }
    const wavesStillRun = checkinPaidToday < PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL;

    let fu: Awaited<ReturnType<typeof followUpCounts>> | null = null;
    try {
      fu = await followUpCounts();
    } catch {
      fu = null;
    }

    const todayRow = (today.rows[0] || {}) as Record<string, number>;

    return NextResponse.json({
      ok: true,
      table_ready: true,
      daily_target: PUBLIC_OWNER_LEADS_DAILY_TARGET,
      daily_hard_cap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
      cold_daily_cap: PUBLIC_OWNER_LEADS_COLD_DAILY_CAP,
      fu_daily_cap: PUBLIC_OWNER_LEADS_FU_DAILY_CAP,
      afternoon_max: PUBLIC_OWNER_LEADS_WAVE_MAX,
      wave_max: PUBLIC_OWNER_LEADS_WAVE_MAX,
      min_queued: PUBLIC_OWNER_LEADS_MIN_QUEUED,
      waves_per_day: PUBLIC_OWNER_LEADS_WAVES_PER_DAY,
      progress_every: PUBLIC_OWNER_LEADS_PROGRESS_EVERY,
      delay_ms: PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
      signup_goal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      onboarding_goal: PUBLIC_OWNER_ONBOARDINGS_DAILY_GOAL,
      checkin_paid_goal: PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL,
      onboardings_today: onboardingsToday,
      checkin_paid_today: checkinPaidToday,
      reserve_ready: reserve,
      afternoon_will_run: wavesStillRun && !isPublicOwnerLeadsPaused(),
      waves_still_run: wavesStillRun && !isPublicOwnerLeadsPaused(),
      paused: isPublicOwnerLeadsPaused(),
      pause_hint: isPublicOwnerLeadsPaused()
        ? 'Captación PAUSADA — PUBLIC_OWNER_LEADS_PAUSED=1'
        : null,
      schedule_hint:
        '08:00–17:30 Madrid · 65/oleada · FU primero (A→B→C) · cold 300 · FU 1000 · stop a 10 Plan Check-in · Telegram 12:00 + 16:00 + 21:00',
      system: {
        model: 'cold+followup',
        hard_cap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
        cold_cap: PUBLIC_OWNER_LEADS_COLD_DAILY_CAP,
        fu_cap: PUBLIC_OWNER_LEADS_FU_DAILY_CAP,
        priority: 'fu_click → fu_open → fu_silent → cold',
        goals: {
          checkin_paid: PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL,
          onboardings: PUBLIC_OWNER_ONBOARDINGS_DAILY_GOAL,
        },
      },
      followup: fu,
      outreach_provider: getOutreachProviderInfo(),
      stats: { ...st, open_rate_pct: openRate, click_rate_pct: clickRate, signup_rate_pct: signupRate },
      today: {
        ...todayRow,
        cold_today: Number(todayRow.cold_today || 0),
        fu_today: Number(todayRow.fu_today || 0),
      },
      by_day: byDay.rows,
      filter: { day: dayFilter || null, status: statusFilter || null },
      sources,
      intake: {
        by_source_today: intakeBySource.rows,
        recent: intakeRecent.rows,
      },
      leads: rows.rows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await authorizeCronOrSuperAdmin(req);
  if (error) return error;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = String(body.action || '');

  try {
    if (action === 'sync_engagement') {
      const r = await syncOutreachEngagementFromTracking();
      return NextResponse.json({ ok: true, ...r });
    }

    if (action === 'sync_bounces') {
      const zoho = await syncZohoBounces({
        limit: typeof body.limit === 'number' ? body.limit : 200,
      });
      return NextResponse.json({ ok: true, zoho });
    }

    if (action === 'import_bounces') {
      const text = String(body.text || body.csv || '');
      if (!text.trim()) {
        return NextResponse.json({ ok: false, error: 'Pega emails o CSV de Zoho Undelivered' }, { status: 400 });
      }
      const result = await applyOutreachBouncesFromText(text, 'csv_import');
      return NextResponse.json({ ok: true, result });
    }

    if (action === 'run_daily') {
      if (isPublicOwnerLeadsPaused() && !body.force) {
        return NextResponse.json({
          ok: false,
          paused: true,
          error:
            'Captación pausada. Pasa force:true solo si quieres enviar igual, o PUBLIC_OWNER_LEADS_PAUSED=0 en Vercel.',
        });
      }
      const dryRun = Boolean(body.dryRun);
      const result = await runDailyPublicOwnerLeads({
        dryRun,
        maxSend: typeof body.max === 'number' ? body.max : PUBLIC_OWNER_LEADS_DAILY_TARGET,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === 'add_sources') {
      const sourcesMeta = await sql`SELECT to_regclass('public.public_owner_lead_sources') AS reg`;
      if (!sourcesMeta.rows[0]?.reg) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Ejecuta migration-public-owner-leads-tracking.sql (tabla sources)',
          },
          { status: 400 }
        );
      }

      const rawList = Array.isArray(body.urls)
        ? body.urls.map(String)
        : String(body.urlsText || '')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

      let inserted = 0;
      let blocked = 0;
      let dup = 0;
      for (const raw of rawList) {
        const url = normalizeUrl(raw);
        if (!url) continue;
        if (isBlockedOutreachHost(url)) {
          blocked++;
          continue;
        }
        const r = await sql`
          INSERT INTO public_owner_lead_sources (url, status)
          VALUES (${url}, 'pending')
          ON CONFLICT (url) DO NOTHING
          RETURNING id
        `;
        if (r.rows[0]?.id) inserted++;
        else dup++;
      }
      return NextResponse.json({ ok: true, inserted, blocked, duplicates: dup, total_input: rawList.length });
    }

    return NextResponse.json({ ok: false, error: 'action inválida' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
