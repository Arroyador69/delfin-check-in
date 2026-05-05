import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

/**
 * POST /api/superadmin/blog/republish-all
 * Re-publica en GitHub TODOS los artículos existentes, para aplicar cambios de plantilla
 * (ej. reemplazar waitlist por planes).
 */
export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(200, Math.max(1, Number(body.limit ?? 50)));
    const publishedOnly = body.published_only !== false; // default true

    const rows = await sql`
      SELECT slug
      FROM blog_articles
      WHERE (${publishedOnly}::boolean = false OR is_published = true)
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT ${limit}
    `;

    const baseUrl = new URL(req.url);
    const publishUrl = new URL('/api/superadmin/blog/publish-to-github', baseUrl.origin);

    const results: Array<{ slug: string; ok: boolean; url?: string; error?: string }> = [];
    for (const r of rows.rows as any[]) {
      const slug = String(r.slug || '').trim();
      if (!slug) continue;
      try {
        const res = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
          body: JSON.stringify({ slug }),
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        results.push({ slug, ok: true, url: data?.url });
      } catch (e: any) {
        results.push({ slug, ok: false, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      ok: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  } catch (e: any) {
    console.error('[republish-all]', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

