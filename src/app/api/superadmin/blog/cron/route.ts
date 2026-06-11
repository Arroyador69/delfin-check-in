import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { getOpenAI } from '@/lib/openai-server';
import {
  type BlogTopicAngle,
  isNormalizedTitleTaken,
  loadExistingNormalizedTitles,
  loadRecentTitlesForPrompt,
  normalizeArticleTitle,
  pickBlogAngleForBatch,
} from '@/lib/blog-article-dedup';
import { Octokit } from '@octokit/rest';
import { injectPlansCaptureBlock, injectSoftPopup, stripLegacyPopups } from '@/lib/blog-capture-html';

type Batch = 'morning' | 'afternoon';

const BLOG_SYSTEM_PROMPT = `Eres un redactor SEO experto en contenido para Delfín Check-in (software de registro de viajeros y gestión de alquiler vacacional en España).

Objetivo:
- Crear artículos largos, útiles y accionables, para posicionar en Google.
- Incluir micro-tutoriales de uso del software (pasos numerados) cuando aplique.

Requisitos:
- Longitud mínima: 1300 palabras aproximadas.
- HTML limpio: <p>, <h2>, <h3>, <ul>/<ol>, <strong>.
- Meta description 150-160 caracteres con keywords.
- Sin formularios/waitlist ni popups en el HTML (la plantilla pública se encarga de CTAs).
- Enfoque captación: parte de viajeros, Ministerio del Interior (RD 933/2021), MIR. No menciones precios ni planes de pago en el cuerpo; el CTA público es solo prueba gratis con 1 propiedad (email).
- El título y el contenido deben ser ORIGINALES: no copies ni parafrasees mínimamente artículos ya publicados.
- El título final debe ser claramente distinto (palabras y enfoque) a cualquier título de la lista "Títulos ya publicados" que recibas.
- Responde ÚNICAMENTE con JSON válido (sin markdown), con estructura:
{
  "slug": "...",
  "title": "...",
  "meta_description": "...",
  "meta_keywords": "...",
  "excerpt": "...",
  "content": "<p>...</p>..."
}`;

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

function toSlug(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function generateArticle(angle: BlogTopicAngle, attempt = 1): Promise<{
  slugBase: string;
  title: string;
  meta_description: string;
  meta_keywords: string;
  excerpt: string;
  content: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const recentTitles = await loadRecentTitlesForPrompt(30);
  const forbiddenNote =
    recentTitles.length > 0
      ? `\n\nTítulos ya publicados (NO reutilizar ni parafrasear de forma casi idéntica):\n${recentTitles.map((t) => `- ${t}`).join('\n')}`
      : '';

  const userPrompt = [
    `Ángulo editorial (familia: ${angle.topicKey}, id: ${angle.angleId}).`,
    `Enfoque guía: "${angle.seedTitle}".`,
    attempt > 1
      ? `IMPORTANTE: el intento anterior generó un título duplicado. Crea un título COMPLETAMENTE nuevo y un contenido con estructura distinta.`
      : '',
    'Genera un artículo nuevo siguiendo los requisitos.',
    forbiddenNote,
  ]
    .filter(Boolean)
    .join('\n');

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: BLOG_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: attempt > 1 ? 0.85 : 0.72,
    max_tokens: 5000,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '';
  if (!raw) throw new Error('OpenAI devolvió contenido vacío');
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlock ? codeBlock[1].trim() : raw;
  const data = JSON.parse(jsonStr) as {
    slug?: string;
    title?: string;
    meta_description?: string;
    meta_keywords?: string;
    excerpt?: string;
    content?: string;
  };

  const slugBase = toSlug(data.slug || data.title || angle.seedTitle) || `articulo-${Date.now()}`;
  let title = String(data.title || '').trim().slice(0, 500);
  if (!title || normalizeArticleTitle(title) === normalizeArticleTitle(angle.seedTitle)) {
    title = `${angle.seedTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim()} — enfoque ${angle.angleId.split('-').pop()} (${new Date().getFullYear()})`.slice(
      0,
      500
    );
  }

  const existingTitles = await loadExistingNormalizedTitles();
  if (isNormalizedTitleTaken(title, existingTitles)) {
    if (attempt < 3) {
      return generateArticle(angle, attempt + 1);
    }
    title = `${title.replace(/\s*\(\d{4}\)\s*$/, '')} — edición ${Date.now().toString(36)}`.slice(0, 500);
    if (isNormalizedTitleTaken(title, existingTitles)) {
      throw new Error(`duplicate_title:${normalizeArticleTitle(title)}`);
    }
  }

  const meta_description = String(data.meta_description || '').slice(0, 500);
  const meta_keywords = String(data.meta_keywords || '').slice(0, 1000);
  const excerpt = String(data.excerpt || '').slice(0, 1000);
  const content = String(data.content || '<p>Contenido pendiente.</p>');

  return { slugBase, title, meta_description, meta_keywords, excerpt, content };
}

async function insertDraft(args: {
  slugBase: string;
  title: string;
  meta_description: string;
  meta_keywords: string;
  excerpt: string;
  content: string;
  batch: Batch;
  topicKey: string;
  angleId: string;
}) {
  // Asegurar slug único
  let finalSlug = args.slugBase;
  const existing = await sql`SELECT id FROM blog_articles WHERE slug = ${finalSlug}`;
  if (existing.rows.length > 0) {
    finalSlug = `${args.slugBase}-${Date.now().toString(36)}`;
  }

  const schema_json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.title,
    description: args.meta_description,
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0],
    author: { '@type': 'Organization', name: 'Delfín Check-in' },
    publisher: { '@type': 'Organization', name: 'Delfín Check-in' },
  };

  // Metemos marcas internas en meta_keywords para deduplicar sin tocar esquema de BD:
  const mk = [
    args.meta_keywords,
    `auto_topic:${args.batch}:1`,
    `auto_topic_key:${args.topicKey}`,
    `auto_topic_angle:${args.angleId}`,
  ]
    .filter(Boolean)
    .join(', ')
    .slice(0, 1000);

  const titleCheck = await sql`
    SELECT id FROM blog_articles
    WHERE LOWER(TRIM(title)) = LOWER(TRIM(${args.title}))
    LIMIT 1
  `;
  if (titleCheck.rows.length > 0) {
    throw new Error(`duplicate_title_db:${args.title}`);
  }

  const result = await sql`
    INSERT INTO blog_articles (
      slug, title, meta_description, meta_keywords,
      content, excerpt, canonical_url, schema_json,
      status, is_published, author_name
    ) VALUES (
      ${finalSlug}, ${args.title}, ${args.meta_description}, ${mk},
      ${args.content}, ${args.excerpt}, ${`https://delfincheckin.com/articulos/${finalSlug}.html`},
      ${JSON.stringify(schema_json)}::jsonb,
      'draft', false, 'Delfín Check-in'
    )
    RETURNING id, slug, title, created_at
  `;
  return result.rows[0] as { id: string; slug: string; title: string; created_at: string };
}

async function publishToGithub(slug: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN_LANDING;
  if (!token) throw new Error('GITHUB_TOKEN (o GITHUB_TOKEN_LANDING) no configurado');

  const articleResult = await sql`
    SELECT id, slug, title, meta_description, meta_keywords, content, excerpt,
           published_at, updated_at, is_published, status
    FROM blog_articles
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (articleResult.rows.length === 0) throw new Error('Artículo no encontrado en BD');
  const article = articleResult.rows[0] as any;

  const publishedAt = article.published_at ? new Date(article.published_at) : new Date();
  const updatedAt = article.updated_at ? new Date(article.updated_at) : publishedAt;
  const publishedDate = publishedAt.toISOString().split('T')[0];
  const modifiedDate = updatedAt.toISOString().split('T')[0];
  const readTime = estimateReadTimeMinutes(article.content || '');

  async function fetchTemplateWithRetry(): Promise<string> {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(TEMPLATE_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (e: any) {
        lastErr = e;
        // Pequeño backoff lineal (no bloquea demasiado el cron)
        await new Promise((r) => setTimeout(r, attempt * 250));
      }
    }
    throw new Error(
      `No se pudo descargar plantilla (${TEMPLATE_URL}). Último error: ${String(lastErr?.message || lastErr)}`
    );
  }

  let html = await fetchTemplateWithRetry();

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
  for (const [from, to] of replacements) html = html.split(from).join(to);

  const scriptSlugLiteral = "const ARTICLE_SLUG = 'multas-por-no-registrar-viajeros-espana';";
  if (html.includes(scriptSlugLiteral)) {
    html = html.replace(scriptSlugLiteral, `const ARTICLE_SLUG = '${article.slug}';`);
  }

  html = stripLegacyPopups(html);
  html = replaceWaitlistWithPlans(html);
  html = injectSoftPopup(html);

  const octokit = new Octokit({
    auth: token,
    request: { headers: { 'X-GitHub-Api-Version': '2022-11-28' } },
  });
  const filePath = `articulos/${article.slug}.html`;

  const contentBase64 = Buffer.from(html, 'utf-8').toString('base64');
  // Evitar 404 ruidoso: primero intentamos crear sin leer sha.
  // Si ya existe, GitHub devuelve 409 y entonces hacemos update con sha.
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
    if (e?.status !== 409) {
      const msg = String(e?.message || e);
      throw new Error(`GitHub createOrUpdate falló (status ${e?.status || 'unknown'}): ${msg}`);
    }
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

async function markPublished(id: string) {
  const now = new Date().toISOString();
  await sql`
    UPDATE blog_articles
    SET is_published = true,
        status = 'published',
        published_at = COALESCE(published_at, ${now}),
        updated_at = ${now}
    WHERE id = ${id}::uuid
  `;
}

export async function GET(req: NextRequest) {
  try {
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    const authHeader = req.headers.get('authorization');

    const { searchParams } = new URL(req.url);
    const batch = (searchParams.get('batch') || 'morning') as Batch;
    const mode = (searchParams.get('mode') || '').toLowerCase(); // 'test' para smoke
    if (batch !== 'morning' && batch !== 'afternoon') {
      return NextResponse.json({ error: 'batch inválido (morning|afternoon)' }, { status: 400 });
    }

    // Auth: Vercel cron es público por diseño (solo Vercel lo llama).
    // Manual: requiere superadmin o Bearer CRON_SECRET.
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const { error } = await verifySuperAdmin(req);
      if (error) return error;
    }

    // Límite duro: 2 artículos/día (1 morning + 1 afternoon)
    // En mode=test, NO aplicamos cuota (sirve para probar el cron sin esperar al día siguiente).
    const day = utcDayKey();
    if (mode !== 'test') {
      const countToday = await sql`
        SELECT COUNT(*)::int AS c
        FROM blog_articles
        WHERE created_at >= ${`${day}T00:00:00.000Z`}::timestamptz
          AND created_at <  ${`${day}T23:59:59.999Z`}::timestamptz
          AND meta_keywords ILIKE '%auto_topic:%'
      `;
      const c = Number(countToday.rows[0]?.c ?? 0);
      if (c >= 2) {
        return NextResponse.json({ success: true, skipped: 'daily_quota_reached', today: c });
      }
    }

    // Modo prueba: crea un artículo corto controlado (sin OpenAI) y lo publica.
    if (mode === 'test') {
      const slugBase = `test-cron-${Date.now().toString(36)}`;
      const title = `TEST Cron Blog (${batch}) — ${day}`;
      const meta_description = 'Artículo de prueba para validar el cron de publicación a GitHub.';
      const meta_keywords = `test, auto_topic:${batch}:1, auto_topic_key:test`;
      const excerpt = 'Prueba de cron (sin OpenAI).';
      const content = `<p>Artículo de prueba para validar que el cron publica correctamente y que el bloque de planes no incluye waitlist.</p>`;
      const draft = await insertDraft({
        slugBase,
        title,
        meta_description,
        meta_keywords,
        excerpt,
        content,
        batch,
        topicKey: 'test',
        angleId: 'test-a1',
      });
      const url = await publishToGithub(draft.slug);
      await markPublished(draft.id);
      return NextResponse.json({ success: true, mode: 'test', batch, slug: draft.slug, url });
    }

    let angle: BlogTopicAngle;
    try {
      angle = await pickBlogAngleForBatch(batch);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.startsWith('already_generated:')) {
        return NextResponse.json({ success: true, skipped: 'already_generated', batch });
      }
      if (msg.startsWith('no_topics_available')) {
        return NextResponse.json({ success: true, skipped: 'no_topics_available', batch });
      }
      throw e;
    }

    const generated = await generateArticle(angle);
    const draft = await insertDraft({
      ...generated,
      batch,
      topicKey: angle.topicKey,
      angleId: angle.angleId,
    });

    const url = await publishToGithub(draft.slug);
    await markPublished(draft.id);

    return NextResponse.json({
      success: true,
      batch,
      topic: angle.seedTitle,
      angle_id: angle.angleId,
      title: draft.title,
      slug: draft.slug,
      url,
    });
  } catch (err: any) {
    console.error('[blog-cron]', err);
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 });
  }
}

