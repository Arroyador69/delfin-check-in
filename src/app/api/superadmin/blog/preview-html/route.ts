/**
 * POST /api/superadmin/blog/preview-html
 * Devuelve HTML montado con _template.html (sin subir a GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import {
  buildLandingArticleHtml,
  fetchLandingArticleTemplate,
  type ArticleForLandingTemplate
} from '@/lib/blog-github-html';

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug || '').trim();

    let article: ArticleForLandingTemplate;

    if (slug && !body.title && !body.content) {
      const articleResult = await sql`
        SELECT slug, title, meta_description, meta_keywords, content, published_at, updated_at
        FROM blog_articles
        WHERE slug = ${slug}
        LIMIT 1
      `;
      if (articleResult.rows.length === 0) {
        return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
      }
      const row = articleResult.rows[0] as any;
      article = {
        slug: row.slug,
        title: row.title,
        meta_description: row.meta_description,
        meta_keywords: row.meta_keywords,
        content: row.content,
        published_at: row.published_at,
        updated_at: row.updated_at
      };
    } else {
      if (!body.title || !body.slug) {
        return NextResponse.json(
          { error: 'Faltan slug y title (o usa solo slug de un artículo guardado).' },
          { status: 400 }
        );
      }
      article = {
        slug: String(body.slug).trim(),
        title: String(body.title),
        meta_description: body.meta_description ?? '',
        meta_keywords: body.meta_keywords ?? '',
        content: String(body.content ?? ''),
        published_at: body.published_at ?? null,
        updated_at: body.updated_at ?? null
      };
    }

    const templateHtml = await fetchLandingArticleTemplate();
    const html = buildLandingArticleHtml(templateHtml, article);

    return NextResponse.json({
      success: true,
      html,
      slug: article.slug
    });
  } catch (err: any) {
    console.error('preview-html:', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo generar la vista previa' },
      { status: 502 }
    );
  }
}
