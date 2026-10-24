import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { authorizeCronOrSuperAdmin } from '@/lib/cron-auth';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
} from '@/lib/public-owner-leads/daily-run';
import { isBlockedOutreachHost, normalizeUrl } from '@/lib/public-owner-leads/extract-web';
import { PUBLIC_OWNER_LEADS_DAILY_TARGET } from '@/lib/public-owner-leads/constants';

async function requireSuperAdmin(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) return null;
  const payload = verifyToken(authToken);
  if (!isEffectiveSuperAdminPayload(payload)) return null;
  return payload;
}

/**
 * GET: métricas campaña + listado leads (opens/clicks/altas/fechas).
 * POST: { action: 'add_sources' | 'run_daily' | 'sync_engagement', urls?: string[], dryRun?: boolean }
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
        leads: [],
        sources: [],
      });
    }

    await syncOutreachEngagementFromTracking();

    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 100), 500);

    const stats = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE opted_out)::int AS opted_out,
        COUNT(*) FILTER (WHERE status = 'new' AND NOT opted_out)::int AS new_count,
        COUNT(*) FILTER (WHERE status = 'queued' AND NOT opted_out)::int AS queued,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
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

    const rows = await sql`
      SELECT
        id, email, domain, source_url, status, opted_out,
        queued_at, sent_at, opened_at, clicked_at, signed_up_at,
        signed_up_tenant_id, created_at, updated_at, notes, last_error
      FROM public_owner_leads
      ORDER BY COALESCE(sent_at, created_at) DESC
      LIMIT ${limit}
    `;

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

    return NextResponse.json({
      ok: true,
      table_ready: true,
      daily_target: PUBLIC_OWNER_LEADS_DAILY_TARGET,
      stats: { ...st, open_rate_pct: openRate, click_rate_pct: clickRate, signup_rate_pct: signupRate },
      today: today.rows[0] || {},
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
