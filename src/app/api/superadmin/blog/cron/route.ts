import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { getOpenAI } from '@/lib/openai-server';
import { Octokit } from '@octokit/rest';

type Batch = 'morning' | 'afternoon';

const TOPICS: Array<{ key: string; title: string }> = [
  { key: 'mir-config', title: 'Cómo configurar el MIR (Ministerio del Interior) en Delfín Check-in paso a paso (2026)' },
  { key: 'rd933-guia', title: 'RD 933/2021 explicado: obligaciones, plazos y cómo cumplir con Delfín Check-in (Actualizado 2026)' },
  { key: 'errores-ses', title: 'Errores frecuentes al enviar partes al SES Hospedajes y cómo solucionarlos (Guía 2026)' },
  { key: 'airbnb-booking', title: 'Airbnb y Booking: ¿quién registra a los viajeros? Qué exige el Ministerio (Actualizado 2026)' },
  { key: 'checkin-digital', title: 'Check-in digital: cómo automatizar el registro de viajeros y evitar multas (Guía práctica 2026)' },
  { key: 'ical-sync', title: 'Sincronización iCal: evita overbooking y mantén calendarios al día (tutorial con Delfín Check-in)' },
  { key: 'reservas-directas', title: 'Reservas directas: cómo reducir comisiones con el microsite de Delfín Check-in (paso a paso)' },
  { key: 'limpieza', title: 'Gestión de limpieza en alquiler vacacional: checklist, horarios y automatización con Delfín Check-in' },
  { key: 'facturas', title: 'Cómo emitir facturas a huéspedes en alquiler vacacional (y automatizarlo) - Guía 2026' },
  { key: 'multas', title: 'Multas por no registrar viajeros en España: importes, casos reales y cómo evitarlas (2026)' },
];

const BLOG_SYSTEM_PROMPT = `Eres un redactor SEO experto en contenido para Delfín Check-in (software de registro de viajeros y gestión de alquiler vacacional en España).

Objetivo:
- Crear artículos largos, útiles y accionables, para posicionar en Google.
- Incluir micro-tutoriales de uso del software (pasos numerados) cuando aplique.

Requisitos:
- Longitud mínima: 1300 palabras aproximadas.
- HTML limpio: <p>, <h2>, <h3>, <ul>/<ol>, <strong>.
- Meta description 150-160 caracteres con keywords.
- Sin formularios/waitlist ni popups en el HTML (la plantilla pública se encarga de CTAs).
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

async function pickTopicKeyForToday(batch: Batch): Promise<{ key: string; title: string }> {
  // 1) No repetir en el mismo día/batch
  const day = utcDayKey();
  const usedToday = await sql`
    SELECT meta_keywords
    FROM blog_articles
    WHERE created_at >= ${`${day}T00:00:00.000Z`}::timestamptz
      AND created_at <  ${`${day}T23:59:59.999Z`}::timestamptz
      AND meta_keywords ILIKE ${`%auto_topic:${batch}:%`}
  `;
  if (usedToday.rows.length > 0) {
    // ya generamos para ese batch hoy
    throw new Error(`already_generated:${batch}`);
  }

  // 2) Evitar repetir keys recientes (últimos 30 posts)
  const recent = await sql`
    SELECT meta_keywords
    FROM blog_articles
    ORDER BY created_at DESC
    LIMIT 30
  `;
  const recentKeys = new Set<string>();
  for (const r of recent.rows as any[]) {
    const mk = String(r.meta_keywords || '');
    const m = mk.match(/auto_topic_key:([a-z0-9-]+)/i);
    if (m?.[1]) recentKeys.add(m[1]);
  }

  const candidates = TOPICS.filter(t => !recentKeys.has(t.key));
  const pool = candidates.length > 0 ? candidates : TOPICS;

  // simple reparto: morning usa pares, afternoon impares, pero cae a pool si no hay
  const filtered = pool.filter((_, idx) => (batch === 'morning' ? idx % 2 === 0 : idx % 2 === 1));
  const finalPool = filtered.length > 0 ? filtered : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

async function generateArticle(topicTitle: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: BLOG_SYSTEM_PROMPT },
      { role: 'user', content: `Tema: "${topicTitle}". Genera un artículo nuevo siguiendo los requisitos.` },
    ],
    temperature: 0.6,
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

  const slugBase = toSlug(data.slug || data.title || topicTitle) || `articulo-${Date.now()}`;
  const title = String(data.title || topicTitle).slice(0, 500);
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
  const mk = [args.meta_keywords, `auto_topic:${args.batch}:1`, `auto_topic_key:${args.topicKey}`]
    .filter(Boolean)
    .join(', ')
    .slice(0, 1000);

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

  const res = await fetch(TEMPLATE_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo descargar plantilla: HTTP ${res.status}`);
  let html = await res.text();

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
    if (!Array.isArray(data) && (data as any).sha) sha = (data as any).sha;
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
    const day = utcDayKey();
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

    let topic;
    try {
      topic = await pickTopicKeyForToday(batch);
    } catch (e: any) {
      if (String(e?.message || '').startsWith('already_generated:')) {
        return NextResponse.json({ success: true, skipped: 'already_generated', batch });
      }
      throw e;
    }

    const generated = await generateArticle(topic.title);
    const draft = await insertDraft({
      ...generated,
      batch,
      topicKey: topic.key,
    });

    const url = await publishToGithub(draft.slug);
    await markPublished(draft.id);

    return NextResponse.json({
      success: true,
      batch,
      topic: topic.title,
      slug: draft.slug,
      url,
    });
  } catch (err: any) {
    console.error('[blog-cron]', err);
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 });
  }
}

