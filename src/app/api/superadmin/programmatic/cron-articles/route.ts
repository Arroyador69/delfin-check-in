/**
 * Cron de artículos SEO: genera 2 artículos/día con OpenAI (1600-2000 palabras),
 * los guarda en blog_articles y programmatic_pages (type article),
 * y publica el HTML en delfincheckin.com/articulos/*.html (GitHub Pages).
 * Mismo layout que el resto de artículos: header, footer, popup, waitlist, FAQ.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { Octokit } from '@octokit/rest';
import {
  ARTICLE_TOPICS,
  pickRandomTopics,
  generateArticleWithOpenAI,
  buildFullArticleHTML,
  type GeneratedArticle,
} from '@/lib/cron-articles';

const GITHUB_OWNER = 'Arroyador69';
const GITHUB_REPO = 'delfincheckin.com';
const GITHUB_BRANCH = 'main';
const ARTICLES_PATH = 'articulos';
const ARTICLES_PER_RUN = 2;

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Asegura slug único: si existe, añade -YYYYMMDD */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const today = getTodayISO().replace(/-/g, '');
  let slug = baseSlug.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase();
  if (!slug) slug = `articulo-${today}`;

  const existing = await sql`
    SELECT 1 FROM blog_articles WHERE slug = ${slug} LIMIT 1
  `;
  if (existing.rows.length === 0) return slug;
  return `${slug}-${today}`;
}

/** Publica el HTML del artículo en GitHub (articulos/slug.html) */
async function publishArticleToGitHub(
  slug: string,
  htmlContent: string,
  title: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const token = process.env.GITHUB_TOKEN_LANDING || process.env.GITHUB_TOKEN;
  if (!token) {
    return { success: false, error: 'Falta GITHUB_TOKEN_LANDING o GITHUB_TOKEN' };
  }

  const octokit = new Octokit({ auth: token });
  const filePath = `${ARTICLES_PATH}/${slug}.html`;

  try {
    let sha: string | undefined;
    try {
      const existing = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
        ref: GITHUB_BRANCH,
      });
      if (!Array.isArray(existing.data)) sha = existing.data.sha;
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    const content = Buffer.from(htmlContent, 'utf-8').toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `[Cron Artículos] ${title}`,
      content,
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    });
    return { success: true, path: filePath };
  } catch (error: any) {
    console.error('Error publicando artículo en GitHub:', error);
    return { success: false, error: error.message };
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';

    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const { error } = await verifySuperAdmin(req);
      if (error) return error;
    }

    const result = await runCronArticles();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ Cron artículos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const stream = body.stream === true;
    const count = Math.min(Math.max(1, parseInt(body.count, 10) || ARTICLES_PER_RUN), 10);

    if (stream && count === 1) {
      return streamOneArticle();
    }

    const result = await runCronArticles(count);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ Cron artículos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

/** Respuesta en stream NDJSON para ver progreso al crear 1 artículo (Probar) */
function streamOneArticle(): Response {
  const encoder = new TextEncoder();
  function push(obj: object) {
    return encoder.encode(JSON.stringify(obj) + '\n');
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const today = getTodayISO();
        const readTimeMin = 8;
        const topics = pickRandomTopics(1);
        const topic = topics[0];

        controller.enqueue(push({ step: 'topic', message: 'Tema elegido', topic: topic.title }));

        controller.enqueue(push({ step: 'openai', message: 'Generando artículo con OpenAI (1–2 min)...' }));
        const generated = await generateArticleWithOpenAI(topic);
        controller.enqueue(push({ step: 'openai_done', message: `Generado: ${generated.word_count} palabras` }));

        controller.enqueue(push({ step: 'slug', message: 'Comprobando slug único...' }));
        const slug = await ensureUniqueSlug(generated.slug);
        const canonicalUrl = `https://delfincheckin.com/articulos/${slug}.html`;

        const schemaJson = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: generated.title,
          datePublished: today,
          dateModified: today,
          author: { '@type': 'Organization', name: 'Delfín Check-in' },
        };

        controller.enqueue(push({ step: 'db', message: 'Guardando en blog_articles y programmatic_pages...' }));
        await sql`
          INSERT INTO blog_articles (
            slug, title, meta_description, meta_keywords, content, excerpt,
            canonical_url, schema_json, status, is_published, published_at, author_name
          ) VALUES (
            ${slug}, ${generated.title}, ${generated.meta_description}, ${generated.meta_keywords},
            ${generated.content_html}, ${generated.excerpt},
            ${canonicalUrl}, ${JSON.stringify(schemaJson)}::jsonb,
            'published', true, ${today}::timestamptz, 'Delfín Check-in'
          )
        `;
        await sql`
          INSERT INTO programmatic_pages (
            template_id, type, slug, canonical_url, title, meta_description,
            content_html, content_jsonld, variables_used, word_count, status, published_at
          ) VALUES (
            NULL, 'article', ${slug}, ${canonicalUrl}, ${generated.title}, ${generated.meta_description},
            ${generated.content_html}, ${JSON.stringify(schemaJson)}::jsonb,
            ${JSON.stringify({ topic_id: topic.id, topic_title: topic.title })}::jsonb,
            ${generated.word_count || 0}, 'published', ${today}::timestamptz
          )
        `;
        controller.enqueue(push({ step: 'db_done', message: 'Guardado en BD' }));

        controller.enqueue(push({ step: 'github', message: 'Publicando en GitHub (articulos/)...' }));
        const fullHtml = buildFullArticleHTML({
          slug,
          title: generated.title,
          meta_description: generated.meta_description,
          meta_keywords: generated.meta_keywords,
          content_html: generated.content_html,
          published_date: today,
          read_time_min: readTimeMin,
          faq: generated.faq || [],
        });
        const publishResult = await publishArticleToGitHub(slug, fullHtml, generated.title);

        if (publishResult.success) {
          controller.enqueue(push({
            step: 'done',
            message: 'Artículo creado y publicado',
            article: { slug, title: generated.title, url: canonicalUrl },
          }));
        } else {
          controller.enqueue(push({
            step: 'error',
            message: publishResult.error || 'Error al publicar en GitHub',
            article: { slug, title: generated.title, url: canonicalUrl },
          }));
        }
      } catch (err: any) {
        controller.enqueue(push({ step: 'error', message: err.message || 'Error interno' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
    },
  });
}

async function runCronArticles(count: number = ARTICLES_PER_RUN): Promise<{
  created: number;
  failed: number;
  articles: Array<{ slug: string; title: string; url: string; error?: string }>;
}> {
  const today = getTodayISO();
  const readTimeMin = 8; // aproximado 1600-2000 palabras
  const results: Array<{ slug: string; title: string; url: string; error?: string }> = [];
  let created = 0;
  let failed = 0;

  const topics = pickRandomTopics(count);

  for (const topic of topics) {
    try {
      const generated = await generateArticleWithOpenAI(topic);
      const slug = await ensureUniqueSlug(generated.slug);
      const canonicalUrl = `https://delfincheckin.com/articulos/${slug}.html`;

      const schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: generated.title,
        datePublished: today,
        dateModified: today,
        author: { '@type': 'Organization', name: 'Delfín Check-in' },
      };

      // 1) Insertar en blog_articles (para Gestión de Artículos y Monitoreo)
      await sql`
        INSERT INTO blog_articles (
          slug, title, meta_description, meta_keywords, content, excerpt,
          canonical_url, schema_json, status, is_published, published_at, author_name
        ) VALUES (
          ${slug}, ${generated.title}, ${generated.meta_description}, ${generated.meta_keywords},
          ${generated.content_html}, ${generated.excerpt},
          ${canonicalUrl}, ${JSON.stringify(schemaJson)}::jsonb,
          'published', true, ${today}::timestamptz, 'Delfín Check-in'
        )
      `;

      // 2) Insertar en programmatic_pages (type article) para que aparezca en Páginas Programáticas
      const ppResult = await sql`
        INSERT INTO programmatic_pages (
          template_id, type, slug, canonical_url, title, meta_description,
          content_html, content_jsonld, variables_used, word_count, status, published_at
        ) VALUES (
          NULL, 'article', ${slug}, ${canonicalUrl}, ${generated.title}, ${generated.meta_description},
          ${generated.content_html}, ${JSON.stringify(schemaJson)}::jsonb,
          ${JSON.stringify({ topic_id: topic.id, topic_title: topic.title })}::jsonb,
          ${generated.word_count || 0}, 'published', ${today}::timestamptz
        )
        RETURNING id
      `;

      // 3) Generar HTML completo y publicar en GitHub
      const fullHtml = buildFullArticleHTML({
        slug,
        title: generated.title,
        meta_description: generated.meta_description,
        meta_keywords: generated.meta_keywords,
        content_html: generated.content_html,
        published_date: today,
        read_time_min: readTimeMin,
        faq: generated.faq || [],
      });

      const publishResult = await publishArticleToGitHub(slug, fullHtml, generated.title);

      if (publishResult.success) {
        created++;
        results.push({
          slug,
          title: generated.title,
          url: canonicalUrl,
        });
      } else {
        failed++;
        results.push({
          slug,
          title: generated.title,
          url: canonicalUrl,
          error: publishResult.error,
        });
      }
    } catch (err: any) {
      failed++;
      results.push({
        slug: topic.id,
        title: topic.title,
        url: '',
        error: err.message || 'Error generando o guardando',
      });
    }
  }

  return { created, failed, articles: results };
}
