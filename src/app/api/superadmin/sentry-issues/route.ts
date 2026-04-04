import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/** Base API Sentry (SaaS US). EU: https://de.sentry.io/api/0 */
function getSentryApiBase(): string {
  const raw = process.env.SENTRY_API_BASE?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'https://sentry.io/api/0';
}

export type SentryIssueRow = {
  id: string;
  title: string;
  shortId: string | null;
  count: string;
  userCount: number;
  lastSeen: string;
  firstSeen: string;
  permalink: string | null;
  status: string;
  level: string | null;
  culprit: string | null;
};

/**
 * Lista issues de Sentry (solo superadmin).
 * Requiere en Vercel (secret):
 * - SENTRY_AUTH_TOKEN: token de integración interna con event:read, project:read
 * - SENTRY_ORG_SLUG: slug de la organización (URL)
 * - SENTRY_PROJECT_SLUG: slug del proyecto (p. ej. delfin-check-in)
 * Opcional: SENTRY_API_BASE=https://de.sentry.io/api/0 (región EU)
 */
export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const org = process.env.SENTRY_ORG_SLUG?.trim();
    const project = process.env.SENTRY_PROJECT_SLUG?.trim();
    const token = process.env.SENTRY_AUTH_TOKEN?.trim();

    if (!org || !project || !token) {
      return NextResponse.json({
        success: true,
        configured: false,
        message:
          'Falta configuración Sentry en el servidor: SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG y SENTRY_PROJECT_SLUG.',
        issues: [] as SentryIssueRow[],
      });
    }

    const { searchParams } = new URL(req.url);
    /** Solo errores/fatal sin resolver. Override con ?query=. */
    const queryFromClient = searchParams.get('query');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const statsPeriod = searchParams.get('statsPeriod') || '14d';

    const base = getSentryApiBase();
    const buildIssuesUrl = (q: string) =>
      `${base}/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?query=${encodeURIComponent(q)}&limit=${limit}&statsPeriod=${encodeURIComponent(statsPeriod)}`;

    let effectiveQuery =
      queryFromClient ||
      'is:unresolved (level:error OR level:fatal)';
    let url = buildIssuesUrl(effectiveQuery);
    let res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    // Algunas regiones/versiones de Sentry rechazan el OR en la query; probamos sin paréntesis.
    if (!res.ok && res.status === 400 && !queryFromClient) {
      effectiveQuery = 'is:unresolved level:error';
      url = buildIssuesUrl(effectiveQuery);
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
    }

    if (!res.ok) {
      const text = await res.text();
      console.error('[sentry-issues] Sentry API error:', res.status, text);
      return NextResponse.json(
        {
          success: false,
          configured: true,
          error: `Sentry API ${res.status}: ${text.slice(0, 500)}`,
          issues: [],
        },
        { status: 502 }
      );
    }

    const raw = (await res.json()) as Record<string, unknown>[];

    const isErrorLevel = (level: unknown) => {
      const lv = String(level ?? '').toLowerCase();
      return lv === 'error' || lv === 'fatal';
    };

    const issues: SentryIssueRow[] = raw
      .filter((row) => isErrorLevel(row.level))
      .map((row) => ({
      id: String(row.id ?? ''),
      title: String(row.title ?? '(sin título)'),
      shortId: row.shortId != null ? String(row.shortId) : null,
      count: String(row.count ?? '0'),
      userCount: typeof row.userCount === 'number' ? row.userCount : 0,
      lastSeen: String(row.lastSeen ?? ''),
      firstSeen: String(row.firstSeen ?? ''),
      permalink: row.permalink != null ? String(row.permalink) : null,
      status: String(row.status ?? ''),
      level: row.level != null ? String(row.level) : null,
      culprit: row.culprit != null ? String(row.culprit) : null,
    }));

    return NextResponse.json({
      success: true,
      configured: true,
      issues,
      org,
      project,
      queryUsed: effectiveQuery,
    });
  } catch (e) {
    console.error('[sentry-issues]', e);
    return NextResponse.json(
      { success: false, error: (e as Error).message, issues: [] },
      { status: 500 }
    );
  }
}
