/**
 * Lógica compartida para el cron del blog:
 * genera con OpenAI (~1600 palabras, SEO) y guarda en BD como borrador.
 * La subida a GitHub la hace Superadmin (revisión) vía /api/superadmin/blog/publish-to-github
 * o esta función publishBlogArticleToGitHub si se invoca desde otro flujo.
 */

import { sql } from '@/lib/db';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';
import { parseAndValidateBlogOpenAIResponse, validateBlogContentOnly } from '@/lib/blog-template';
import {
  buildLandingArticleHtml,
  fetchLandingArticleTemplate,
  GITHUB_BRANCH,
  GITHUB_OWNER,
  GITHUB_REPO
} from '@/lib/blog-github-html';

const BLOG_SYSTEM_PROMPT = `Eres un redactor SEO experto en contenido para Delfín Check-in (PMS y software de registro de viajeros para alquiler vacacional en España).

Nuestros artículos tratan de: registro de viajeros, Ministerio del Interior, SES hospedajes, multas por no registrar, declaración informativa, check-in digital obligatorio, RD 933/2021, Airbnb y Booking (si registran o no), comunidades autónomas, plazos, errores frecuentes al enviar datos, etc.

Estilo de los artículos existentes:
- Títulos claros y con año cuando aplica (ej: "... (Actualizado 2026)", "... paso a paso (Ministerio del Interior 2026)").
- Meta description 150-160 caracteres, con palabras clave.
- Contenido en HTML: párrafos <p>, subtítulos <h2> y <h3>, listas <ul>/<ol>, <strong> para énfasis. Sin waitlist ni popup en el HTML (eso lo añade la plantilla de la web).
- Tono educativo, legal/normativo cuando toque, orientado a propietarios de alquiler vacacional.
- Keywords en meta_keywords separadas por comas.
- Optimización para Google y para asistentes IA: estructura clara (H2/H3), definiciones concisas al inicio de secciones, respuestas directas a preguntas frecuentes en el texto (para que los snippets y las IAs puedan citar y resumir bien).

Debes responder ÚNICAMENTE con un JSON válido (sin markdown, sin \`\`\`), con esta estructura exacta:
{
  "slug": "url-amigable-del-articulo-sin-acentos",
  "title": "Título del artículo",
  "meta_description": "Descripción para SEO, máx 160 caracteres",
  "meta_keywords": "palabra1, palabra2, palabra3, ...",
  "excerpt": "Resumen breve 1-2 frases para listados",
  "content": "<p>...</p><h2>...</h2><p>...</p>..."
}

REQUISITOS IMPORTANTES PARA "content" (ARTICLE_CONTENT):
- content debe ser SOLO un fragmento HTML (NO incluyas <html>, <head>, <body>, <header>, <footer>, <script>, <style>).
- content NO debe incluir <h1>.
- content debe incluir jerarquía clara: al menos 2 secciones con <h2> y al menos 1 <h3>.
- content debe incluir al menos 1 lista (<ul> o <ol>).
- Usa HTML consistente: <p>, <h2>, <h3>, <ul>/<ol>/<li>, <strong>/<em>, <blockquote>.
- Si usas cajas, usa exactamente: <div class="highlight-box"> o <div class="warning-box">.
`;

export async function generateBlogArticle(
  topic: string,
  targetWords: number = 1600
): Promise<{ slug: string; title: string }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no configurada');

  const userPrompt = `Genera un artículo nuevo para el blog de Delfín Check-in sobre este tema: "${topic}".

El artículo debe ser útil para propietarios de alquiler vacacional en España (registro de viajeros, normativa, Ministerio del Interior, multas, etc.). Mismo estilo y profundidad que nuestros otros artículos. IMPORTANTE: el contenido debe tener aproximadamente ${targetWords} palabras para posicionar bien en Google. Incluye secciones con H2/H3, listas, ejemplos y tono educativo. Responde solo con el JSON.`;

  let validated: { slug?: string; title?: string; meta_description?: string; meta_keywords?: string; excerpt?: string; content?: string } | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nVALIDACION_PREVIA_FALLIDA: ${String(lastError?.message || lastError)}\n\nCorrige SOLO el campo "content" para cumplir el esquema y la validación (mantén el JSON válido).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: BLOG_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 5000,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    if (!raw) {
      lastError = new Error('OpenAI no devolvió contenido');
      continue;
    }

    let jsonStr = raw;
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();

    try {
      validated = parseAndValidateBlogOpenAIResponse(jsonStr);
      break;
    } catch (e: any) {
      lastError = e;
    }
  }

  if (!validated) {
    throw new Error(`OpenAI validación falló: ${String(lastError?.message || lastError || 'error desconocido')}`);
  }

  const slug =
    (validated.slug || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `articulo-${Date.now()}`;
  const title = (validated.title || topic).slice(0, 500);
  const meta_description = (validated.meta_description || '').slice(0, 160);
  const meta_keywords = (validated.meta_keywords || '').slice(0, 1000);
  const excerpt = (validated.excerpt || '').slice(0, 1000);
  const content = validated.content || '<p>Contenido pendiente.</p>';

  const schema_json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: meta_description,
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0],
    author: { '@type': 'Organization', name: 'Delfín Check-in' },
    publisher: { '@type': 'Organization', name: 'Delfín Check-in' },
  };

  let finalSlug = slug;
  const existing = await sql`SELECT id FROM blog_articles WHERE slug = ${finalSlug}`;
  if (existing.rows.length > 0) {
    finalSlug = `${slug}-${Date.now().toString(36)}`;
  }

  await sql`
    INSERT INTO blog_articles (
      slug, title, meta_description, meta_keywords,
      content, excerpt, canonical_url, schema_json,
      status, is_published, published_at, author_name
    ) VALUES (
      ${finalSlug}, ${title}, ${meta_description}, ${meta_keywords},
      ${content}, ${excerpt}, ${`https://delfincheckin.com/articulos/${finalSlug}.html`},
      ${JSON.stringify(schema_json)}::jsonb,
      'draft', false, null, 'Delfín Check-in (cron)'
    )
  `;

  return { slug: finalSlug, title };
}

export async function publishBlogArticleToGitHub(slug: string): Promise<{ url: string }> {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN_LANDING;
  if (!token) throw new Error('GITHUB_TOKEN no configurado');

  const articleResult = await sql`
    SELECT slug, title, meta_description, meta_keywords, content, published_at, updated_at
    FROM blog_articles WHERE slug = ${slug} LIMIT 1
  `;
  if (articleResult.rows.length === 0) throw new Error('Artículo no encontrado');
  const article = articleResult.rows[0] as any;

  const contentCheck = validateBlogContentOnly(article.content || '');
  if (!contentCheck.valid) {
    throw new Error(`HTML inválido: ${contentCheck.errors.join(' | ')}`);
  }

  const templateHtml = await fetchLandingArticleTemplate();
  const html = buildLandingArticleHtml(templateHtml, {
    slug: article.slug,
    title: article.title,
    meta_description: article.meta_description,
    meta_keywords: article.meta_keywords,
    content: article.content,
    published_at: article.published_at,
    updated_at: article.updated_at
  });

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
    message: `[Cron] Publicar artículo: ${article.title}`,
    content: contentBase64,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  });

  return { url: `https://delfincheckin.com/articulos/${article.slug}.html` };
}
