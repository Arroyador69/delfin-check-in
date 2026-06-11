/**
 * POST /api/superadmin/blog/publish-to-github
 * Genera el HTML del artículo desde la plantilla de la landing y lo sube al repo delfincheckin.com (GitHub).
 * Así el artículo queda en la web pública y deja de dar 404.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';
import { injectPlansCaptureBlock, injectSoftPopup } from '@/lib/blog-capture-html';

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';
const TEMPLATE_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articulos/_template.html`;

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function estimateReadTimeMinutes(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

function replaceWaitlistWithPlans(html: string): string {
  let out = html;

  out = out.replace(/<section[^>]*class="waitlist-section"[\s\S]*?<\/section>/gi, '');
  out = out.replace(
    /<section\b[^>]*id=["']registro["'][^>]*>[\s\S]*?(waitlistForm|lista de espera|acceso permanente|Quiero acceso anticipado)[\s\S]*?<\/section>/gi,
    ''
  );
  out = out.replace(/<div[^>]*id="popupWaitlist"[\s\S]*?<\/div>\s*<\/div>/gi, '');
  out = out.replace(/<div[^>]*class="popup-overlay"[\s\S]*?<\/div>/gi, '');
  out = out.replace(/<form[^>]*>[\s\S]*?(waitlist|popupWaitlist)[\s\S]*?<\/form>/gi, '');
  out = out.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?\/blog\/waitlist(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
    ''
  );
  out = out.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?(waitlist|popupWaitlist)(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
    ''
  );

  return injectPlansCaptureBlock(out);
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug || '').trim();
    const republishAll = body.republishAll === true || body.all === true;
    const limitRaw = Number(body.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : 20;
    if (!republishAll && !slug) {
      return NextResponse.json(
        { error: 'Falta el campo "slug" del artículo (o usa { republishAll: true }).' },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN_LANDING;
    if (!token) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN (o GITHUB_TOKEN_LANDING) no configurado. No se puede publicar en GitHub.' },
        { status: 500 }
      );
    }

    let templateHtml: string;
    try {
      const res = await fetch(TEMPLATE_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      templateHtml = await res.text();
    } catch (e: any) {
      console.error('Error fetching template:', e);
      return NextResponse.json(
        { error: 'No se pudo descargar la plantilla del repo. Comprueba que _template.html existe en articulos/.' },
        { status: 502 }
      );
    }

    const octokit = new Octokit({ auth: token });
    // Evita warning deprecación: API versioning (GitHub REST).
    (octokit as any).request?.defaults?.({
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });

    async function publishOne(article: any) {
      const publishedAt = article.published_at ? new Date(article.published_at) : new Date();
      const updatedAt = article.updated_at ? new Date(article.updated_at) : publishedAt;
      const publishedDate = publishedAt.toISOString().split('T')[0];
      const modifiedDate = updatedAt.toISOString().split('T')[0];
      const readTime = estimateReadTimeMinutes(article.content || '');

      const replacements: [string, string][] = [
        ['{{ARTICLE_TITLE}}', escapeAttr(article.title || '')],
        ['{{META_DESCRIPTION}}', escapeAttr(article.meta_description || '')],
        ['{{META_KEYWORDS}}', escapeAttr(article.meta_keywords || '')],
        ['{{ARTICLE_SLUG}}', article.slug],
        ['{{PUBLISHED_DATE}}', publishedDate],
        ['{{MODIFIED_DATE}}', modifiedDate],
        ['{{PUBLISH_DATE}}', publishedDate],
        ['{{READ_TIME}}', String(readTime)],
        ['{{ARTICLE_CONTENT}}', article.content || ''],
      ];
      let html = templateHtml;
      for (const [from, to] of replacements) html = html.split(from).join(to);

      const scriptSlugLiteral = "const ARTICLE_SLUG = 'multas-por-no-registrar-viajeros-espana';";
      if (html.includes(scriptSlugLiteral)) {
        html = html.replace(scriptSlugLiteral, `const ARTICLE_SLUG = '${article.slug}';`);
      }

      // IMPORTANTE: eliminamos waitlist/popup y colocamos CTA de planes en todos los artículos.
      html = replaceWaitlistWithPlans(html);
      html = injectSoftPopup(html);

      const filePath = `articulos/${article.slug}.html`;

      const contentBase64 = Buffer.from(html, 'utf-8').toString('base64');
      // Evitar 404 ruidoso: intentamos crear sin leer sha.
      // Si ya existe, GitHub devolverá 409 y entonces actualizamos con sha.
      try {
        await octokit.repos.createOrUpdateFileContents({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: filePath,
          message: `Publicar artículo: ${article.title}`,
          content: contentBase64,
          branch: GITHUB_BRANCH,
        });
      } catch (e: any) {
        if (e?.status !== 409) throw e;
        const { data } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: filePath,
          ref: GITHUB_BRANCH,
        });
        const sha = !Array.isArray(data) && (data as any).sha ? String((data as any).sha) : undefined;
        if (!sha) throw new Error('No se pudo obtener sha del fichero existente en GitHub');
        await octokit.repos.createOrUpdateFileContents({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: filePath,
          message: `Actualizar artículo: ${article.title}`,
          content: contentBase64,
          branch: GITHUB_BRANCH,
          sha,
        });
      }

      return `https://delfincheckin.com/articulos/${article.slug}.html`;
    }

    if (republishAll) {
      const list = await sql`
        SELECT id, slug, title, meta_description, meta_keywords, content, excerpt,
               published_at, updated_at, is_published, status
        FROM blog_articles
        WHERE is_published = true
        ORDER BY updated_at DESC NULLS LAST
        LIMIT ${limit}
      `;

      const results: Array<{ slug: string; url?: string; ok: boolean; error?: string }> = [];
      for (const row of list.rows as any[]) {
        try {
          const url = await publishOne(row);
          results.push({ slug: row.slug, url, ok: true });
        } catch (e: any) {
          results.push({ slug: row.slug, ok: false, error: e?.message || 'Error' });
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'republishAll',
        limit,
        results,
      });
    }

    const articleResult = await sql`
      SELECT id, slug, title, meta_description, meta_keywords, content, excerpt,
             published_at, updated_at, is_published, status
      FROM blog_articles
      WHERE slug = ${slug}
      LIMIT 1
    `;
    if (articleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artículo no encontrado en la base de datos.' },
        { status: 404 }
      );
    }
    const article = articleResult.rows[0] as any;

    const url = await publishOne(article);
    return NextResponse.json({
      success: true,
      url,
      message: 'Artículo publicado en GitHub. En unos minutos estará en ' + url,
    });
  } catch (err: any) {
    console.error('Error publicando en GitHub:', err);
    return NextResponse.json(
      { error: err?.message || 'Error al publicar en GitHub' },
      { status: 500 }
    );
  }
}
