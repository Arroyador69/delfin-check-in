/**
 * POST /api/superadmin/blog/publish-to-github
 * Genera el HTML del artículo desde la plantilla de la landing y lo sube al repo delfincheckin.com (GitHub).
 * Así el artículo queda en la web pública y deja de dar 404.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';

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

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug || '').trim();
    if (!slug) {
      return NextResponse.json(
        { error: 'Falta el campo "slug" del artículo.' },
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

    const publishedAt = article.published_at ? new Date(article.published_at) : new Date();
    const updatedAt = article.updated_at ? new Date(article.updated_at) : publishedAt;
    const publishedDate = publishedAt.toISOString().split('T')[0];
    const modifiedDate = updatedAt.toISOString().split('T')[0];
    const readTime = estimateReadTimeMinutes(article.content || '');

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
    for (const [from, to] of replacements) {
      html = html.split(from).join(to);
    }
    const scriptSlugLiteral = "const ARTICLE_SLUG = 'multas-por-no-registrar-viajeros-espana';";
    if (html.includes(scriptSlugLiteral)) {
      html = html.replace(scriptSlugLiteral, `const ARTICLE_SLUG = '${article.slug}';`);
    }

    const octokit = new Octokit({ auth: token });
    const filePath = `articulos/${article.slug}.html`;

    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
        ref: GITHUB_BRANCH,
      });
      if (!Array.isArray(data) && data.sha) sha = data.sha;
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    const contentBase64 = Buffer.from(html, 'utf-8').toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `Publicar artículo: ${article.title}`,
      content: contentBase64,
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    });

    const url = `https://delfincheckin.com/articulos/${article.slug}.html`;
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
