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
  PUBLIC_OWNER_LEADS_AFTERNOON_MAX,
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_DAILY_TARGET,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from '@/lib/public-owner-leads/constants';
import { syncZohoBounces } from '@/lib/zoho-bounce-sync';

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
          WHERE status = 'sent'
            AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
        )::int AS sent_today,
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

    const byDay = await sql`
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

    return NextResponse.json({
      ok: true,
      table_ready: true,
      daily_target: PUBLIC_OWNER_LEADS_DAILY_TARGET,
      daily_hard_cap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
      afternoon_max: PUBLIC_OWNER_LEADS_AFTERNOON_MAX,
      wave_max: PUBLIC_OWNER_LEADS_DAILY_TARGET,
      min_queued: PUBLIC_OWNER_LEADS_MIN_QUEUED,
      waves_per_day: 4,
      signup_goal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      reserve_ready: reserve,
      afternoon_will_run: signedToday < PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      stats: { ...st, open_rate_pct: openRate, click_rate_pct: clickRate, signup_rate_pct: signupRate },
      today: today.rows[0] || {},
      by_day: byDay.rows,
      filter: { day: dayFilter || null, status: statusFilter || null },
      sources,
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
